import { message, room as Room } from './prisma.client'

export interface ServerToClientEvents {
    noArg: () => void
    withAck: (d: string, callback: (e: number) => void) => void
    updateNetworkList: (users: string[]) => void
    privateMessage: (targetRoomId: string, msg: string, senderUsername: string) => void
    userRoomsUpdated: (rooms: Room[]) => void
    roomChanged: (room: Room) => void
    sendingMessages: () => void
    messagesRequested: (messages: message[]) => void
}

// for socket.on()
export interface ClientToServerEvents {
    privateMessage: (targetRoomId: string, msg: string) => void
    updateNetworkList: (users: string[]) => void
    removeUserFromNetwork: (newConnectionName: string) => void // might wanna use acknowledgment here
    roomSelected: (roomId: string) => void
    createNewRoom: (participant: string, callback: (response: null | string) => void) => void
    addUsersToRoom: (usersToAdd: string[], roomName: string) => void
    messagesRequested: (roomId: string) => void
}
