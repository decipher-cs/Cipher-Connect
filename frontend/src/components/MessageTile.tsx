import { Download, ArrowForwardRounded, Preview, SmsFailedRounded, ArrowDropDownRounded } from '@mui/icons-material'
import { Avatar, Box, IconButton, InputAdornment, Paper, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { MouseEvent, useContext, useState } from 'react'
import { CredentialContext } from '../contexts/Credentials'
import { useSocket } from '../hooks/useSocket'
import { Message, MessageContentType, Room, RoomType, User, UserWithoutID } from '../types/prisma.client'
import { AudioPlayer } from './AudioPlayer'
import { MessageTilePopover } from './MessageTilePopover'
import { StyledTextField } from './StyledTextField'

export type MessageTileProps = {
    autoScrollToBottomRef: React.RefObject<HTMLDivElement> | null
    message: Message
    user: UserWithoutID
    roomType: RoomType
}

export const MessageTile = ({
    autoScrollToBottomRef,
    roomType,
    user,
    message: { roomId, contentType, content, key: messageKey, senderUsername, createdAt, editedAt },
}: MessageTileProps) => {
    const { username } = useContext(CredentialContext)

    const alignment: 'left' | 'right' = senderUsername === username ? 'right' : 'left'

    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

    const handleClickOnPopoverAnchor = (e: MouseEvent<HTMLElement>) => setPopoverAnchor(e.currentTarget)

    const socket = useSocket()

    const isPopoverOpen = Boolean(popoverAnchor)

    const closePopover = () => setPopoverAnchor(null)

    const [textEditModeEnabled, setTextEditMode] = useState(false)

    const [editableInputValue, setEditableInputValue] = useState(content)

    const handleTextEditConfirm = () => {
        socket.emit('textMessageUpdated', messageKey, editableInputValue.trim(), roomId)
        setTextEditMode(false)
    }

    const messageDeliveryTimeAndDate = new Date(createdAt).getHours() + ':' + new Date(createdAt).getMinutes()

    if (!content) return null

    return (
        <>
            <Box
                sx={{
                    justifySelf: alignment === 'left' ? 'flex-start' : 'flex-end',
                    background: 'transparent',
                    backgroundColor: 'transparend',
                    position: 'relative',
                    maxWidth: '90%',
                    width: 'fit-content',
                    display: 'grid',
                    gridTemplateRows: 'auto auto',
                    gridTemplateColumns: 'auto auto auto',
                    columnGap: 2,
                    rowGap: 1,
                }}
            >
                {senderUsername !== username && roomType === RoomType.group ? (
                    <>
                        <Avatar src={user?.avatarPath ?? ''} sx={{ gridRow: '1 / 3', width: 50, height: 50 }} />
                        <Typography>{user.username}</Typography>
                    </>
                ) : null}
                <Typography
                    variant='subtitle2'
                    sx={{
                        placeSelf: 'flex-end',
                        gridColumn: roomType === RoomType.group || senderUsername === username ? '3' : '2',
                        gridRow: '1',
                    }}
                >
                    {messageDeliveryTimeAndDate}
                </Typography>

                <MessageTilePopover
                    open={isPopoverOpen}
                    handleClose={closePopover}
                    anchor={popoverAnchor}
                    messageId={messageKey}
                    roomId={roomId}
                    textEditModeEnabled={textEditModeEnabled}
                    toggleEditMode={() => setTextEditMode(p => !p)}
                    contentType={contentType}
                    senderUsername={senderUsername}
                />
                <Box
                    sx={{ gridRow: '2', gridColumn: '2/span 2', ':hover': { cursor: 'pointer' } }}
                    onClick={handleClickOnPopoverAnchor}
                >
                    {contentType === MessageContentType.text ? (
                        <Paper
                            sx={{
                                px: 4,
                                py: 3,
                                backgroundImage:
                                    username === senderUsername
                                        ? 'linear-gradient(45deg,#3023AE 0%,#FF0099 100%)'
                                        : '#000',
                                borderRadius: alignment === 'left' ? '0px 45px 45px 45px' : '45px 0px 45px 45px',
                            }}
                            ref={autoScrollToBottomRef}
                        >
                            {textEditModeEnabled ? (
                                <StyledTextField
                                    value={editableInputValue}
                                    multiline
                                    onChange={e => setEditableInputValue(e.target.value)}
                                    onKeyDown={e => (e.key === 'enter' ? handleTextEditConfirm : null)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position='end'>
                                                <IconButton onClick={handleTextEditConfirm}>
                                                    <ArrowForwardRounded />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            ) : (
                                <Typography sx={{ overflowWrap: 'break-word' }}>{content}</Typography>
                            )}
                        </Paper>
                    ) : (
                        <MediaDisplay content={content} contentType={contentType} />
                    )}
                </Box>
            </Box>
        </>
    )
}

const MediaDisplay = ({ content, contentType }: Pick<Message, 'contentType' | 'content'>) => {
    // TODO: append file extension and MIME on explicit download. Put a download button.

    const { data: mediaSrc, status } = useQuery({
        queryKey: [content],
        queryFn: () => fetch(content).then(res => res.blob().then(blob => URL.createObjectURL(blob))),
    })

    if (!content || status === 'error')
        return (
            <Box
                sx={{
                    px: 4,
                    py: 3,
                    aspectRatio: '2/1',
                    display: 'flex',
                    placeContent: 'center',
                }}
            >
                <SmsFailedRounded fontSize='large' />
            </Box>
        )

    switch (contentType) {
        case MessageContentType.audio:
            return <AudioPlayer audioSrc={mediaSrc ?? ''} />

        // TODO: a new component for Type = file
        // File should open in new tab as preview
        // generate a thumnail of the file contents
        case MessageContentType.file:
            return (
                <>
                    {mediaSrc ? (
                        <Box
                            sx={{
                                border: 'solid white 5px',
                                aspectRatio: '2/1',
                                width: '200px',
                                display: 'flex',
                                placeItems: 'center',
                                placeContent: 'center',
                                borderRadius: '20px',
                            }}
                        >
                            <IconButton href={mediaSrc} target='_blank'>
                                <Download />
                            </IconButton>
                            <IconButton href={mediaSrc} target='_blank'>
                                <Preview />
                            </IconButton>
                        </Box>
                    ) : (
                        <Skeleton sx={{ height: 100, aspectRatio: '2/1' }} variant='rounded' animation='wave' />
                    )}
                </>
            )

        case MessageContentType.video:
            return (
                <>
                    {mediaSrc ? (
                        <Box
                            component='video'
                            src={mediaSrc}
                            controls
                            sx={{
                                maxHeight: '40svh',
                                maxWidth: '100%',

                                border: 'solid white 5px',
                                borderRadius: '20px',
                            }}
                        />
                    ) : (
                        <Skeleton sx={{ height: 250, aspectRatio: '4/5' }} variant='rounded' animation='wave' />
                    )}
                </>
            )

        case MessageContentType.image:
            return (
                <>
                    {mediaSrc ? (
                        <Box
                            component='img'
                            src={mediaSrc}
                            loading='lazy'
                            sx={{
                                maxHeight: '30svh',
                                maxWidth: '100%',
                                border: 'solid white 5px',
                                borderRadius: '20px',
                                ':hover': {
                                    // TODO: backdrop and icon with fullscreen button
                                },
                            }}
                        />
                    ) : (
                        <Skeleton sx={{ height: 250, aspectRatio: '4/5' }} variant='rounded' animation='wave' />
                    )}
                </>
            )

        default:
            return null
    }
}
