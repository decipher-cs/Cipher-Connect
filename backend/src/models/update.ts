import { Message, Room, UserMessage, UserRoom } from '@prisma/client'
import { prisma } from '../server.js'
import { User } from '../types.js'

export const updateUser = async (username: string, user: Partial<User>) => {
    try {
        const result = await prisma.user.update({ where: { username }, data: { ...user } })
        return Boolean(result)
    } catch (err) {
        return null
    }
}

export const updateRoom = async (roomId: string, room: Partial<Room>) => {
    return await prisma.room.update({
        where: { roomId },
        data: { ...room },
    })
}

export const updateUserRoom = async (
    roomId: Room['roomId'],
    username: User['username'],
    newConfig: Partial<
        Pick<
            UserRoom,
            | 'isHidden'
            | 'isBlocked'
            | 'isNotificationMuted'
            | 'isAdmin'
            | 'isPinned'
            | 'lastReadMessageId'
            | 'isMarkedFavourite'
            | 'joinedAt'
        >
    >
): Promise<Boolean> => {
    try {
        const changedConfig = await prisma.userRoom.updateMany({
            where: { roomId, username },
            data: { ...newConfig },
        })
        return changedConfig.count >= 1
    } catch (error) {
        return false
    }
}

export const updateRoomImage = async (roomId: string, pathToImg: string) => {
    return await prisma.room.update({
        where: { roomId },
        data: { roomAvatar: pathToImg },
    })
}

export const updateRoomParticipants = async (roomId: Room['roomId'], participantsUsernames: User['username'][]) => {
    const usernameObj = participantsUsernames.map(username => ({ username }))

    try {
        const updatedRoom = await prisma.room.update({
            where: { roomId },
            data: {
                user: { connect: usernameObj },

                userRoom: {
                    connectOrCreate: participantsUsernames.map(username => ({
                        where: { username_roomId: { username, roomId } },
                        create: { username },
                    })),
                },
            },
        })
        return updatedRoom
    } catch (error) {
        return null
    }
}

export const updateMessageReadStatus = async (
    roomId: Room['roomId'],
    lastReadMessageId: UserRoom['lastReadMessageId'],
    usernames?: User['username'][]
) => {
    await prisma.userRoom.updateMany({
        where: {
            roomId,
            username: usernames ? { in: usernames } : undefined,
        },
        data: { lastReadMessageId },
    })
}

export const updateUserLastReadMessage = async (
    roomId: Room['roomId'],
    username: User['username'],
    lastReadMessageId: NonNullable<UserRoom['lastReadMessageId']>
): Promise<Boolean | null> => {
    try {
        const userRoom = await prisma.userRoom.update({
            where: { username_roomId: { roomId, username } },
            data: {
                lastReadMessageId,
            },
        })
        return Boolean(userRoom)
    } catch (error) {
        return null
    }
}

export const updateTextMessageContent = async (
    key: Message['key'],
    content: Message['content']
): Promise<Date | null> => {
    try {
        const { editedAt } = await prisma.message.update({
            where: { key },
            data: { content },
            select: { editedAt: true },
        })
        return editedAt
    } catch (err: any) {
        console.log('error while updating message content.', err)
        if ('code' in err && err?.code === 'P2025') return null
        return null
    }
}

export const upsertUserMessage = async (
    username: User['username'],
    messageKey: Message['key'],
    userMessage?: Partial<Omit<UserMessage, 'username' | 'messageKey'>>
) => {
    return await prisma.userMessage.upsert({
        where: { username_messageKey: { username, messageKey } },
        update: { ...userMessage },
        create: {
            message: { connect: { senderUsername_key: { key: messageKey, senderUsername: username } } },
            user: { connect: { username } },
            ...userMessage,
        },
    })
}
