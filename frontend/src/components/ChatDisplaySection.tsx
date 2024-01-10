import { Box, Button, ButtonGroup, CircularProgress, Container, List, ListItem } from '@mui/material'
import { memo, useEffect, useMemo, useRef } from 'react'
import React, { useState } from 'react'
import { MessageWithOptions, User } from '../types/prisma.client'
import { MessageTile } from './MessageTile'
import { ChatInputBar } from './ChatInputBar'
import { RoomBanner } from './RoomBanner'
import { Message } from '../types/prisma.client'
import { MessageListAction, MessageListActionType, messageListReducer } from '../reducer/messageListReducer'
import { Routes } from '../types/routes'
import { TypingStatus } from '../types/socket'
import { RoomsState } from '../reducer/roomReducer'
import { useSocket } from '../hooks/useSocket'
import { useQuery } from '@tanstack/react-query'
import { axiosServerInstance } from '../App'
import { PulseLoader } from 'react-spinners'
import Mark from 'mark.js'
import { useAuth } from '../hooks/useAuth'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { ArrowDownwardRounded, ArrowUpwardRounded, Room } from '@mui/icons-material'
import { useToast } from '../hooks/useToast'

export interface ChatDisplaySectionProps {
    currRoom: RoomsState['joinedRooms'][0]
    toggleRoomInfoSidebar: () => void
    users: RoomsState['usersInfo']
    messages: Message[]
    messageDispatcher: React.Dispatch<MessageListAction>
}

const MESSAGE_FETCH_SIZE = 10

export const ChatDisplaySection = memo((props: ChatDisplaySectionProps) => {
    const { currRoom, users, toggleRoomInfoSidebar, messageDispatcher, messages: unfilteredMessages } = props

    const {
        authStatus: { username },
    } = useAuth()

    /* const messagesWithLastRead = (() => {
        // 1. Get every username's last read message id
        // 2. Get timestamp for each message obtained in stap 1
        // 3. Loop through message array and check message's timestamp against each user's last read message's timestamp
        // 4.1. If message arrived before last read message, add username to message's read receipt array
        // 4.2. If not, check continue

        const userRoomArrWithoutSender = currRoom.userRoomArr.filter(userRoom => userRoom.username !== username)
        const userArrWithUserLastReadMsgTimestamps = userRoomArrWithoutSender.map(userRoom => {
            const message = unfilteredMessages.find(msg => msg.key === userRoom.lastReadMessageId)
            return { lastReadMessageTimestamp: message?.createdAt, username: userRoom.username }
        })

        const messagesWithLastRead = unfilteredMessages.map(msg => {
            const message: typeof msg = structuredClone(msg)
            message.readByUsername = []
            for (const usersLastReadMsgTimestamp of userArrWithUserLastReadMsgTimestamps) {
                if (!usersLastReadMsgTimestamp?.lastReadMessageTimestamp) continue
                if (message.createdAt <= usersLastReadMsgTimestamp?.lastReadMessageTimestamp) {
                    message.readByUsername.push(usersLastReadMsgTimestamp.username)
                }
            }
            return message
        })
        return messagesWithLastRead
    })() */

    //TODO: Instead of this expensive calculation, just remove message from local state and add hidded: true to server state.
    const messages = useMemo(
        () =>
            unfilteredMessages.filter(msg => {
                return msg.messageOptions === undefined || msg.messageOptions.isHidden === false
            }),
        [unfilteredMessages]
    )


    const { notify } = useToast()

    const socket = useSocket()

    const messageContainer = useRef<HTMLElement>(null)

    const virtuosoRef = useRef<VirtuosoHandle>(null)

    const { data: messageCount, status: messageCountFetchStatus } = useQuery({
        queryKey: ['messageSize', currRoom.roomId],
        queryFn: () =>
            axiosServerInstance.get<number>(Routes.get.messageCount + '/' + currRoom.roomId).then(res => {
                if (typeof Number(res.data) === 'number') {
                    return Number(res.data)
                } else throw new Error('incorrect type recieved from server while fetching message count')
            }),
    })

    const [firstItemIndex, setFirstItemIndex] = useState(1000000) // A really big no. to create an offset between the ver first and very last message. This should technically be the length of the messages of room

    useEffect(() => {
        if (messageCount && messageCountFetchStatus === 'success') setFirstItemIndex(messageCount)
    }, [messageCount])

    const [messagesFetchStatus, setMessagesFetchStatus] = useState<'fetching' | 'success' | 'error'>('fetching')

    const fetchPrevPage = (cursor: string) => {
        setMessagesFetchStatus('fetching')
        axiosServerInstance
            .get<MessageWithOptions[]>(
                Routes.get.messages + `/${currRoom.roomId}?messageQuantity=${MESSAGE_FETCH_SIZE}&${'cursor=' + cursor}`
            )
            .then(res => {
                const result = res.data.map(msg => ({ ...msg, deliveryStatus: 'delivered' })) satisfies Message[]

                if (result.length >= 1) setFirstItemIndex(p => p - result.length)
                messageDispatcher({
                    type: MessageListActionType.prepend,
                    newMessage: [...result],
                    roomId: currRoom.roomId,
                })
            })
            .catch(err => {
                notify('Error while getting messages from the server. Will try again.', 'error')
            })
            .finally(() => {
                setMessagesFetchStatus('success')
            })
    }

    const [usersCurrentlyTyping, setUsersCurrentlyTyping] = useState<User['username'][] | null>(null)

    useEffect(() => {
        socket.on('typingStatusChanged', (status, roomId, username) => {
            if (roomId !== currRoom.roomId) return
            if (status === TypingStatus.typing) {
                setUsersCurrentlyTyping(p => {
                    if (p === null) return [username]
                    if (p.includes(username)) return p
                    return p.concat(username)
                })
            } else if (status === TypingStatus.notTyping) {
                setUsersCurrentlyTyping(p => {
                    if (p === null) return p
                    if (p.includes(username)) return p.filter(pUsername => pUsername !== username)
                    return p
                })
            }
        })
        return () => {
            socket.removeListener('typingStatusChanged')
        }
    }, [usersCurrentlyTyping, currRoom.roomId])

    useEffect(() => {
        socket.on('messageDeleted', (messageKey, roomId) => {
            if (currRoom.roomId === roomId) {
                messageDispatcher({ type: MessageListActionType.remove, messageKey, roomId: currRoom.roomId })
            }
        })

        return () => {
            socket.removeListener('messageDeleted')
        }
    }, [currRoom.roomId])

    useEffect(() => {
        socket.on('textMessageUpdated', (key, content, roomId, editedAt) => {
            if (roomId === currRoom.roomId) {
                messageDispatcher({
                    type: MessageListActionType.edit,
                    updatedMessage: { content, key, editedAt, deliveryStatus: 'delivered' },
                    roomId: currRoom.roomId,
                })
            }
        })

        return () => {
            socket.removeListener('textMessageUpdated')
        }
    }, [currRoom.roomId])

    return (
        <>
            <RoomBanner
                toggleRoomInfoSidebar={toggleRoomInfoSidebar}
                room={currRoom}
                searchContainerRef={messageContainer}
                users={users}
            />

            {messageCountFetchStatus === 'loading' || messagesFetchStatus === 'fetching' ? (
                <CircularProgress sx={{ justifySelf: 'center', position: 'absolute', zIndex: 99, top: '10%' }} />
            ) : null}

            <Box ref={messageContainer}>
                {messages.length >= 1 ? (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={messages?.filter(msg => msg.roomId === currRoom.roomId)}
                        followOutput={'smooth'}
                        overscan={30}
                        firstItemIndex={firstItemIndex}
                        endReached={() => {
                            const lastReadMessageId = messages.at(-1)?.key

                            if (!lastReadMessageId || currRoom.lastReadMessageId === lastReadMessageId) return
                            axiosServerInstance.put(Routes.put.lastReadMessage, {
                                lastReadMessageId: lastReadMessageId,
                                roomId: currRoom.roomId,
                            } satisfies {
                                lastReadMessageId: string
                                roomId: typeof currRoom.roomId
                            })
                        }}
                        startReached={() => {
                            if (messages[0]?.key) fetchPrevPage(messages[0].key)
                            else throw new Error('message[0] is not defined')
                        }}
                        initialTopMostItemIndex={{ behavior: 'auto', index: messages.length - 1, align: 'center' }}
                        itemContent={(_, message) => {
                            return (
                                <MessageTile
                                    key={message.key}
                                    message={message}
                                    roomType={currRoom.roomType}
                                    users={users}
                                    messageDispatcher={messageDispatcher}
                                />
                            )
                        }}
                    />
                ) : null}
            </Box>

            {usersCurrentlyTyping !== null && usersCurrentlyTyping.length > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    {usersCurrentlyTyping.join(', ') + ' typing'} <PulseLoader size={3} />
                </Box>
            ) : null}

            <ChatInputBar messageListDispatcher={messageDispatcher} currRoom={currRoom} />
            <ButtonGroup fullWidth variant='text'>
                <Button
                    onClick={() => {
                        // TODO: convert scroll behaviour to 'smooth'
                        if (virtuosoRef.current) virtuosoRef.current.scrollToIndex(0)
                    }}
                    startIcon={<ArrowUpwardRounded />}
                >
                    scroll to top
                </Button>
                <Button
                    onClick={() => {
                        if (virtuosoRef.current) virtuosoRef.current.scrollToIndex(messages.length - 1)
                    }}
                    endIcon={<ArrowDownwardRounded />}
                >
                    scroll to bottom
                </Button>
            </ButtonGroup>
        </>
    )
})
