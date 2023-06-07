import { Server } from 'socket.io'
import {
    addMessageToDB,
    createPrivateRoom,
    getAllMessagesFromRoom,
    getUserAndUserRoomsFromDB,
    getUserRoomsFromDB,
} from './model.js'
import { message, room } from '@prisma/client'

interface ServerToClientEvents {
    noArg: () => void
    basicEmit: (a: number, b: string, c: Buffer) => void
    withAck: (d: string, callback: (e: number) => void) => void
    privateMessage: (targetRoomId: string, msg: string, senderUsername: string) => void
    userRoomsUpdated: (rooms: room[]) => void
    roomChanged: (room: room) => void
    messagesRequested: (messages: message[]) => void
}

// for io.on()
interface InterServerEvents {}

// for socket.on()
interface ClientToServerEvents {
    privateMessage: (targetRoomId: string, msg: string) => void
    addUsersToRoom: (usersToAdd: string[], roomName: string) => void
    createNewRoom: (participant: string, callback: (response: null | string) => void) => void
    roomSelected: (roomId: string) => void
    messagesRequested: (roomId: string) => void
}

interface SocketData {
    username: string
}

export const initSocketIO = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    // Set socket.data.username on socket
    io.use((socket, next) => {
        const username: string | undefined = socket.handshake.auth.username

        if (username === undefined) return next(new Error('Username not valid'))

        socket.data.username = username

        return next()
    })

    io.on('connection', socket => {
        if (socket.data.username === undefined) throw new Error('Socket.data.username is undefined')

        const username = socket.data.username

        const userRooms: Awaited<ReturnType<typeof getUserRoomsFromDB>> = []

        getUserRoomsFromDB(username).then(rooms => {
            if (rooms === undefined) return
            userRooms.push(...rooms)
            socket.emit('userRoomsUpdated', rooms)
        })

        socket.rooms.forEach(roomId => socket.leave(roomId))

        socket.join(username)

        socket.on('privateMessage', async (targetRoomId, messageContent) => {
            socket.broadcast.to(targetRoomId).emit('privateMessage', targetRoomId, messageContent, username)
            // Sync the broadcast and the insert call made to DB
            const msg = await addMessageToDB(username, targetRoomId, messageContent)
            console.log(msg)
        })

        socket.on('createNewRoom', async (participant, callback) => {
            // check if participant exists
            const participantUserDetails = await getUserAndUserRoomsFromDB(participant)

            if (participantUserDetails === null) {
                callback('User Does Not Exist')
                return
            }

            // check if participants are already in a private group with current username. If they are not, then create a new room
            const roomDoesExists = participantUserDetails.rooms.find(room => {
                return room.isMaxCapacityTwo && room.participants.find(user => user.username === username)
            })

            if (roomDoesExists !== undefined) {
                callback('Already In A Room With User')
                return
            }

            try {
                const room = await createPrivateRoom(username, participant)
                userRooms.push(room)
                socket.emit('userRoomsUpdated', userRooms)
                callback(null)
            } catch (err) {
                callback('Unknown Server Error')
            }
        })

        socket.on('roomSelected', roomId => {
            const room = userRooms.find(room => room.roomId === roomId)
            if (room !== undefined) {
                socket.emit('roomChanged', room)
            }
            socket.rooms.forEach(room => socket.leave(room))
            socket.join(roomId)
        })

        socket.on('messagesRequested', async roomId => {
            const messages = await getAllMessagesFromRoom(roomId)
            if (messages !== undefined) socket.emit('messagesRequested', messages)
        })

        socket.on('disconnect', () => {})
    })
}
