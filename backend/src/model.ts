// Model interactes with the database (mySQL) //

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

export const createNewUser = async (username: string, passwordHash: string) => {
    try {
        const returnedData = await prisma.user.create({ data: { username, passwordHash } })
        return returnedData
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') return null
        }
        throw err
    }
}

export const getAllUsers = async () => {
    const allUsers = await prisma.user.findMany()
    return allUsers
}

export const deleteAllUsers = async () => {
    const deletedUsers = await prisma.user.deleteMany()
    return deletedUsers
}

export const getUser = async (username: string) => {
    prisma.user.findUnique({
        where: { username },
    })
}

export const getUserHash = async (username: string) => {
    const hash = await prisma.user.findUnique({
        where: { username },
        select: { passwordHash: true },
    })
    return hash
}

export const addRefreshToken = async (username: string, token: string) => {
    const refreshToken = await prisma.refreshToken.create({ data: { userUsername: username, tokenValue: token } })
    return refreshToken
}

export const retrieveRefreshToken = async (username: string) => {
    const refreshToken = await prisma.refreshToken.findMany({
        where: { userUsername: username },
        select: { tokenValue: true },
    })
    return refreshToken
}
