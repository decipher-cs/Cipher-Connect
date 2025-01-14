import { produce } from 'immer'
import { MessageContentType, Room, UserRoom } from '../types/prisma.client'
import { User, RoomDetails } from '../types/prisma.client'

export type RoomsState = {
    selectedRoomIndex: null | number
    joinedRooms: RoomDetails[]
    usersInfo: { [username: User['username']]: User | undefined }
}

export enum RoomActionType {
    addRoom = 'addRoom',
    removeRoom = 'removeRoom',
    hideRoom = 'hide',
    addParticipantsToRoom = 'addParticipant',
    removeParticipantsFromRoom = 'removeParticipant',
    changeSelectedRoom = 'changeRoom',
    removeAllRooms = 'removeAllRooms',
    initilizeRooms = 'initilizeRooms',

    updateRoomDetails = 'updateRoomDetails',
    // alterRoomProperties = 'alterRoomProperties',
    // changeNotificationStatus = 'changeNotificationStatus',
    // changeRoomConfig = 'changeRoomConfig',

    addUsers = 'add',
    removeUsers = 'remove',
    editUserDetails = 'edit',
}

export type RoomActions =
    | {
          type: RoomActionType.addRoom
          rooms: RoomsState['joinedRooms'][0] | RoomsState['joinedRooms']
      }
    | {
          type: RoomActionType.removeRoom
          roomId: RoomsState['joinedRooms'][0]['roomId']
      }
    | {
          type: RoomActionType.changeSelectedRoom
          newlySelectedIndex: NonNullable<RoomsState['selectedRoomIndex']>
      }
    | {
          type: RoomActionType.removeParticipantsFromRoom
          roomId: Room['roomId']
          usernamesToRemove: RoomsState['joinedRooms'][0]['participants']
      }
    | {
          type: RoomActionType.addParticipantsToRoom
          roomId: Room['roomId']
          participants: RoomsState['joinedRooms'][0]['participants']
      }
    | {
          type: RoomActionType.addUsers
          details: User[]
      }
    | {
          type: RoomActionType.removeUsers
          usernames: User['username'][]
      }
    | {
          type: RoomActionType.editUserDetails
          username: User['username']
          newDetails: Partial<User>
      }
    | {
          // When the app loads and the rooms are fetched from server
          type: RoomActionType.initilizeRooms
          rooms: RoomsState['joinedRooms']
      }
    | {
          type: RoomActionType.removeAllRooms
      }
    | {
          type: RoomActionType.updateRoomDetails
          roomId: Room['roomId']
          newRoomProperties: Partial<RoomsState['joinedRooms'][0]>
      }
/* | {
          type: RoomActionType.alterRoomProperties
          roomId: Room['roomId']

          //roomId, username, roomtype, and pariticpants should be readonly.
          newRoomProperties: Partial<
              Omit<RoomsState['joinedRooms'][0], 'roomId' | 'roomType' | 'username' | 'participants'>
          >
      }
    | {
          type: RoomActionType.changeNotificationStatus
          roomId: RoomsState['joinedRooms'][0]['roomId']
          unreadMessages: boolean
      }
    | {
          type: RoomActionType.changeRoomConfig
          roomId: RoomsState['joinedRooms'][0]['roomId']
          newConfig: Partial<Pick<RoomConfig, 'isNotificationMuted' | 'isHidden'>>
      } */

export const roomReducer: React.Reducer<RoomsState, RoomActions> = (state, action) => {
    const { type } = action
    const { joinedRooms, selectedRoomIndex } = state
    const { removeAllRooms, addUsers, updateRoomDetails, initilizeRooms, removeUsers, editUserDetails } = RoomActionType

    switch (type) {
        case initilizeRooms: {
            const { rooms } = action
            return { ...state, selectedRoomIndex: null, joinedRooms: [...rooms] } satisfies RoomsState
        }

        case updateRoomDetails: {
            const { newRoomProperties, roomId } = action
            joinedRooms.forEach((room, i) => {
                if (room.roomId === roomId) joinedRooms[i] = { ...room, ...newRoomProperties } satisfies RoomDetails
            })
            return { ...state, ...joinedRooms } satisfies RoomsState
        }

        case RoomActionType.addRoom: {
            const { rooms } = action

            if (Array.isArray(rooms)) state.joinedRooms = [...rooms, ...joinedRooms]
            else state.joinedRooms = [...joinedRooms, rooms]

            return state satisfies RoomsState
        }

        case RoomActionType.removeRoom: {
            const { roomId } = action

            if (selectedRoomIndex !== null && joinedRooms[selectedRoomIndex]?.roomId === roomId) {
                state.selectedRoomIndex = null
                state.joinedRooms = joinedRooms.filter(r => r.roomId !== action.roomId)
            } else state.joinedRooms = joinedRooms.filter(r => r.roomId !== action.roomId)

            return state satisfies RoomsState
        }

        case RoomActionType.removeParticipantsFromRoom: {
            joinedRooms.forEach(room => {
                if (room.roomId === action.roomId) {
                    room.participants = room.participants.filter(
                        username => !action.usernamesToRemove.includes(username)
                    )
                }
            })
            return state satisfies RoomsState
        }
        case RoomActionType.addParticipantsToRoom: {
            return produce(state, draft => {
                draft.joinedRooms.forEach(room => {
                    if (room.roomId === action.roomId) {
                        room.participants.push(...action.participants)
                    }
                })
            })
        }

        case RoomActionType.changeSelectedRoom: {
            const { newlySelectedIndex } = action
            if (newlySelectedIndex === selectedRoomIndex) return state satisfies RoomsState

            return { ...state, selectedRoomIndex: newlySelectedIndex } satisfies RoomsState
        }

        case removeAllRooms: {
            return { ...state, joinedRooms: [], selectedRoomIndex: null } satisfies RoomsState
        }

        case addUsers: {
            const { details } = action
            for (const detail of details) {
                state.usersInfo[detail.username] = detail
            }
            return state satisfies RoomsState
        }

        case removeUsers: {
            const { usernames } = action
            for (const username of usernames) {
                delete state.usersInfo[username]
            }
            return state satisfies RoomsState
        }

        case editUserDetails: {
            const { newDetails, username } = action
            const { usersInfo } = state

            let user = usersInfo[username]

            if (user !== undefined) {
                user = { ...user, ...newDetails }
            }

            return { ...state, usersInfo: { ...usersInfo, [username]: user } } satisfies RoomsState
        }

        default:
            throw new Error('Switch found a default case white reducing rooms. See roomReducer.')
    }
}
