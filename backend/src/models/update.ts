import { Message, Room, User, UserRoom } from '@prisma/client'
import { prisma } from '../server.js'
import { UserWithoutID } from '../types.js'

export const updateUser = async (username: string, user: Partial<UserWithoutID>) => {
    return await prisma.user.update({ where: { username }, data: { ...user } })
}

export const updateRoom = async (roomId: string, room: Partial<Room>) => {
    return await prisma.room.update({
        where: { roomId },
        data: { ...room },
    })
}

export const updateRoomImage = async (roomId: string, pathToImg: string) => {
    return await prisma.room.update({
        where: { roomId },
        data: { roomAvatar: pathToImg },
    })
}

export const updateRoomParticipants = async (roomId: Room['roomId'], participantsUsernames: User['username'][]) => {
    const usernameObj = participantsUsernames.map(username => ({ username }))

    const updatedRoom = await prisma.room.update({
        where: { roomId },
        data: {
            user: { connect: usernameObj },

            userRoomConfig: {
                connectOrCreate: participantsUsernames.map(username => ({
                    where: { username_roomId: { username, roomId } },
                    create: { username },
                })),
            },

            userRoom: {
                connectOrCreate: participantsUsernames.map(username => ({
                    where: { username_roomId: { username, roomId } },
                    create: { username },
                })),
            },
        },
    })
    return updatedRoom.roomId
}

export const updateMessageReadStatus = async (
    roomId: Room['roomId'],
    hasUnreadMessages: UserRoom['hasUnreadMessages'],
    usernames?: User['username'][]
) => {
    await prisma.userRoom.updateMany({
        where: {
            roomId,
            username: usernames ? { in: usernames } : undefined,
        },
        data: { hasUnreadMessages },
    })
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
