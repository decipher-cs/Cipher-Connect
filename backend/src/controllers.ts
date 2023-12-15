import bcrypt from 'bcrypt'
import { Request, Response } from 'express'
import {
    checkIfUserExists,
    getMessagesFromRoom,
    getRoomDetails,
    getRoomPariticpants,
    getUniqueRoomDetails,
    getUser,
    getUserHash,
    getUsers,
} from './models/find.js'
import { createGroup, createNewUser, createPrivateRoom } from './models/create.js'
import { deleteRoom, deleteUserRoom } from './models/delete.js'
import {
    updateMessageReadStatus,
    updateRoom,
    updateRoomConfig,
    updateRoomParticipants,
    updateUser,
} from './models/update.js'
import { UserWithoutID } from './types.js'
import { UTApi } from 'uploadthing/server'
import { RoomConfig } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const utapi = new UTApi()

export const loginUser = async (req: Request, res: Response) => {
    if (req.session.username) {
        res.redirect('logout')
        return
    }

    let response: { message: undefined | string } = { message: undefined }

    const { username, password } = req.body

    if (!username || typeof username !== 'string' || !password) {
        response = { message: 'username/password not provided' }
        res.status(400).json(response)
        return
    }

    const hash = await getUserHash(username) // get password hash from DB

    if (!hash) {
        response = { message: 'Incorrect username/password.' }
        res.status(400).json(response)
        return
    }

    if (!(await bcrypt.compare(password, hash))) {
        response = { message: 'Incorrect username/password.' }
        res.status(400).json(response)
        return
    }

    req.session.regenerate(err => {
        if (err) {
            response = { message: 'Server failed, try again or make a report to the developer.' }
            res.status(500).json(response)
            return
        }
        req.session.username = username
        response = { message: undefined }
        res.status(201).send(username)
    })

    return
}

// User sign-up
export const createUser = async (req: Request, res: Response) => {
    let { username, password } = req.body

    let response: { message: undefined | string } = { message: undefined }

    if (!username || typeof username !== 'string' || !password) {
        response = { message: 'username/password not provided' }
        res.status(400).json(response)
        return
    }

    const passwordHash = await bcrypt.hash(password, 8) // hash password

    const newUserDetails = await createNewUser(username, passwordHash) // put hash and username in DB

    if (!newUserDetails) {
        // check for username collision
        response = { message: 'Username not available.' }
        res.status(400).json(response)
        return
    }

    req.session.regenerate(err => {
        if (err) {
            response = { message: 'Server failed, try again or make a report to the developer.' }
            res.status(500).json(response)
            return
        }
        req.session.username = username
        response = { message: undefined }
        res.status(201).send(username)
    })
    return
}

export const logoutUser = async (req: Request, res: Response) => {
    req.session.destroy(err => {
        if (!err) res.sendStatus(200)
        else res.sendStatus(500)
    })
}

export const storeMediaToFS = async (req: Request, res: Response) => {
    if (req.file === undefined) {
        res.sendStatus(400)
        return
    }

    const { filename }: Express.Multer.File = req.file

    res.json(filename)
    return
}

export const storeAvatarToFS = async (req: Request, res: Response) => {
    const { username } = req.session
    const { roomId } = req.body

    if (req.file === undefined) {
        res.sendStatus(400)
        return
    }

    const { filename }: Express.Multer.File = req.file

    if (username) await updateUser(username, { avatarPath: filename })
    else if (roomId) {
        const room = await updateRoom(roomId, { roomAvatar: filename })
        console.log(room)
    } else {
        res.sendStatus(400)
        return
    }

    res.json(filename)
    return
}

export const returnUser = async (req: Request, res: Response) => {
    let { username } = req.params
    if (username === undefined) {
        res.sendStatus(400)
        return
    }

    try {
        const user = await getUser(username)
        if (user === null) throw new Error('no user found with that username')
        res.send(user)
    } catch (err) {
        res.sendStatus(400)
    }
    return
}
export const returnUsers = async (req: Request, res: Response) => {
    const { usernames } = req.query as { usernames: string[] }

    try {
        if (!usernames || Array.isArray(usernames) === false) throw new Error('Expected array')

        const users = await getUsers(usernames)

        res.send(users)
    } catch (err) {
        res.sendStatus(400)
    }
    return
}

export const fetchMessages = async (req: Request, res: Response) => {
    const { roomId } = req.params
    let { cursor, messageQuantity } = req.query
    if (roomId === undefined) {
        res.sendStatus(400)
        return
    }

    messageQuantity = Number(messageQuantity) ? messageQuantity : undefined
    cursor = cursor ? String(cursor) : undefined

    const messages = await getMessagesFromRoom(roomId, cursor, Number(messageQuantity))

    if (messages === undefined) {
        res.sendStatus(400)
    } else res.send(messages)

    return
}

export const fetchRoomPariticpants = async (req: Request, res: Response) => {
    const { roomId } = req.body
    if (roomId === undefined) {
        res.sendStatus(400)
        return
    }
    const participants = await getRoomPariticpants(roomId)
    if (participants === undefined) {
        res.sendStatus(400)
    } else res.send(participants)
    return
}

export const handleGettingRoomDetails = async (req: Request, res: Response) => {
    const { username } = req.params

    if (username === undefined) {
        res.sendStatus(400)
        return
    }

    const rooms = await getRoomDetails({ username })

    res.send(rooms)
}
export const handleGettingUniqueRoomDetails = async (req: Request, res: Response) => {
    const { username, roomId } = req.params

    if (username === undefined) {
        res.sendStatus(400)
        return
    }

    try {
        const room = await getUniqueRoomDetails(username, roomId)
        res.send(room)
    } catch (err) {
        res.sendStatus(400)
    }
    return
}

export const handlePrivateRoomCreation = async (req: Request, res: Response) => {
    const { participants }: { participants: [string, string] } = req.body

    if (participants.length !== 2) {
        res.sendStatus(400)
        return
    }

    try {
        const roomId = await createPrivateRoom(...participants)
        // const roomDetails: RoomDetails[] = await getRoomDetails(roomId)
        res.send(roomId)
    } catch (err) {
        res.sendStatus(400)
    }
}

export const handleGroupCreation = async (req: Request, res: Response) => {
    const { participants, roomDisplayName }: { participants: [string, string]; roomDisplayName: string } = req.body

    if (participants.length < 2) {
        res.sendStatus(400)
        return
    }

    try {
        const roomId = await createGroup(participants, roomDisplayName)
        // const roomDetails: RoomDetails[] = await getRoomDetails(roomId)
        res.send(roomId)
    } catch (err) {
        res.sendStatus(400)
    }
}

export const handleUserDeletesRoom = async (req: Request, res: Response) => {
    const { roomId } = req.params
    if (!roomId) {
        res.sendStatus(400)
        return
    }
    try {
        const removedUserRoom = await deleteRoom(roomId)
    } catch (err) {}
    res.sendStatus(200)
}

export const handleUserLeavesRoom = async (req: Request, res: Response) => {
    const { username, roomId } = req.params
    if (!username || !roomId) {
        res.sendStatus(400)
        return
    }
    try {
        const removedUserRoom = await deleteUserRoom(username, roomId)
    } catch (err) {}
    res.sendStatus(200)
}

export const handleUserExistsCheck = async (req: Request, res: Response) => {
    const { username } = req.params
    if (!username) res.send(false)
    const userExists = await checkIfUserExists(username)
    res.send(userExists)
}
export const handleNewParticipants = async (req: Request, res: Response) => {
    type Body = { roomId: string; participants: string[] }

    const { roomId, participants }: Body = req.body

    try {
        await updateRoomParticipants(roomId, participants)
        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(400)
    }
    return
}

export const handleMessageReadStatusChange = async (req: Request, res: Response) => {
    const { roomId, username } = req.params
    const { lastUnreadMessageKey } = req.body
    try {
        if (!roomId || !username || !lastUnreadMessageKey) throw new Error('Incorrect params')

        await updateMessageReadStatus(roomId, lastUnreadMessageKey, [username])

        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(400)
    }
}

export const handleUserProfileUpdation = async (req: Request, res: Response) => {
    const { username } = req.session
    const { status, displayName }: Partial<Pick<UserWithoutID, 'displayName' | 'username' | 'status'>> = req.body
    const { buffer } = req.file ?? { buffer: undefined }
    let avatarPath: string | undefined

    try {
        if (!username) throw new Error('No username provided while updating profile')

        if (buffer) {
            const blob = new Blob([buffer])

            const { data, error } = await utapi.uploadFiles(blob)

            if (error || !data) throw new Error('Error uploading file')

            avatarPath = data.url
        }

        await updateUser(username, { displayName, status, avatarPath })

        res.sendStatus(200)
    } catch (err) {
        console.log('errr', err)
        res.sendStatus(400)
    }
}

export const handleMediaUpload = async (req: Request, res: Response) => {
    try {
        if (!req.file) throw new Error('no file to upload')

        const { buffer, mimetype, originalname, size } = req.file

        if (!buffer) throw new Error('empty buffer for file')

        const blob = new Blob([buffer], { type: mimetype })

        const { data, error } = await utapi.uploadFiles(blob, { metadata: { mimetype, name: originalname } })

        if (error || !data) throw new Error('Error uploading file')

        res.send(data.url)
    } catch (err) {
        res.sendStatus(400)
        throw err
    }
}

export const handleAvatarChange = async (req: Request, res: Response) => {
    const { roomId } = req.body
    const { username } = req.session

    try {
        if (!req.file) throw new Error('no file to upload')

        const { buffer, mimetype, originalname, size } = req.file

        if (!buffer) throw new Error('empty buffer for file')

        const blob = new Blob([buffer], { type: mimetype })

        const { data, error } = await utapi.uploadFiles(blob, { metadata: { mimetype, name: originalname } })

        if (error || !data) throw new Error('Error uploading file')

        if (username) await updateUser(username, { avatarPath: data.url })
        else if (roomId) await updateRoom(roomId, { roomAvatar: data.url })
        else throw new Error()

        res.json(data.url)
    } catch (err) {
        res.sendStatus(400)
    }
}

export const handleRoomConfigChange = async (req: Request, res: Response) => {
    const { roomId, ...newConfig }: RoomConfig = req.body
    const { username } = req.session

    if (!username) {
        res.status(400)
        return
    }

    const changedConfig = await updateRoomConfig(roomId, username, newConfig)
    res.json(changedConfig)
}

export const doesValidUserSessionExist = async (req: Request, res: Response) => {
    if (req.session.id && req.session.username) {
        res.status(201).end(req.session.username)
    } else {
        res.sendStatus(401)
    }
    return
}

export const isServerOnline = async (req: Request, res: Response) => {
    res.sendStatus(200)
}

export const test = async (req: Request, res: Response) => {
    console.log('test point hit', req.session.id)
    res.sendStatus(201)
    return
}
