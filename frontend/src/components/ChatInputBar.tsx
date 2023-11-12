import { ArrowRight, AttachFileRounded, MicRounded } from '@mui/icons-material'
import { IconButton, InputAdornment, ToggleButton } from '@mui/material'
import { useContext, useState } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { Message, MessageContentType } from '../types/prisma.client'
import { SocketWithCustomEvents, TypingStatus } from '../types/socket'
import { MultimediaAttachmentMenu } from './MultimediaAttachmentMenu'
import { StyledTextField } from './StyledTextField'
import { CredentialContext } from '../contexts/Credentials'
import { MessageListAction, MessageListActionType } from '../reducer/messageListReducer'
import { RoomActionType, RoomsState } from '../reducer/roomReducer'
import { Routes } from '../types/routes'
import filetypeinfo, { filetypeextension, filetypemime, filetypename } from 'magic-bytes.js'
import { useSocket } from '../hooks/useSocket'
import { useMutation } from '@tanstack/react-query'
import { axiosServerInstance } from '../App'

const mimeToFileType = (mime: string) => {
    return mime.split('/')[0]
}

interface ChatInputBarProps {
    currRoom: RoomsState['joinedRooms'][0]
    messageListDispatcher: React.Dispatch<MessageListAction>
}

export const ChatInputBar = (props: ChatInputBarProps) => {
    const { username } = useContext(CredentialContext)

    const [currInputText, setCurrInputText] = useState('')

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

    const [recordedAudioFile, setRecordedAudioFile] = useState<Blob>()

    const { recordingState, toggleAudioRecorderStartStop, isMicReady, micPermission } = useAudioRecorder(ev => {
        handleMessageDelivery({ content: ev.data, contentType: MessageContentType.audio })
    })

    const { mutateAsync: uploadMedia, data } = useMutation({
        mutationKey: ['uploadMedia'],
        mutationFn: (fd: FormData) => axiosServerInstance.post<string>(Routes.post.media, fd).then(res => res.data),
    })

    const socket = useSocket()

    type HandleMessageDeliveryArgs =
        | {
              content: string
              contentType: MessageContentType.text
          }
        | {
              content: File | Blob
              // MIME: string
              contentType: Exclude<MessageContentType, MessageContentType.text>
          }

    const handleMessageDelivery = async (args: HandleMessageDeliveryArgs) => {
        let { content, contentType } = args

        if (typeof content !== 'string') {
            const formData = new FormData()
            formData.append('upload', content)
            try {
                content = await uploadMedia(formData)
            } catch (error) {
                // TODO: notify user of error
                throw new Error('something wrong')
            }
        }

        const message: Message = {
            key: crypto.randomUUID(),
            roomId: props.currRoom.roomId,
            editedAt: null,
            senderUsername: username,
            createdAt: new Date(),
            contentType,
            content: content,
        }

        socket.emit('message', message)

        props.messageListDispatcher({ type: MessageListActionType.add, newMessage: message })
    }

    const handleUpload = async (
        fileList: FileList | null,
        type: Exclude<MessageContentType, MessageContentType.text>
    ) => {
        if (fileList === null || fileList.length <= 0) return

        setMenuAnchor(null) // closes the open menu

        for (let file of fileList) {
            const u8Array = new Uint8Array(await file.arrayBuffer())

            const { extension, mime } = filetypeinfo(u8Array)[0]

            // TODO: throw error or notification
            if (extension === undefined || mime === undefined) return
            if (extension.length === 0 || mime.length === 0) return
            if (mimeToFileType(mime) !== mimeToFileType(file.type)) return

            file = new File([file], crypto.randomUUID() + extension, { type: mime })

            // TODO: preview file before uploading to server.
            handleMessageDelivery({
                content: file,
                contentType: MessageContentType[type],
                // MIME: mime,
            })
        }
    }

    const emitTextMessage = () => {
        const trimmedText = currInputText.slice().trim()
        if (trimmedText.length <= 0) return
        handleMessageDelivery({ content: trimmedText, contentType: MessageContentType.text })
        setCurrInputText('')
    }

    return (
        <>
            <StyledTextField
                sx={{
                    background: theme =>
                        theme.palette.mode === 'dark'
                            ? theme.palette.background.default
                            : theme.palette.primary.contrastText,
                    width: '80%',
                    justifySelf: 'center',
                    mb: 1,
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position='start'>
                            <IconButton onClick={e => setMenuAnchor(e.currentTarget)}>
                                <AttachFileRounded />
                            </IconButton>
                        </InputAdornment>
                    ),

                    endAdornment: (
                        <InputAdornment position='end'>
                            <ToggleButton
                                onClick={toggleAudioRecorderStartStop}
                                selected={recordingState === 'recording'}
                                value='audio recording'
                                color='primary'
                                sx={{ border: '0px' }}
                            >
                                <MicRounded />
                            </ToggleButton>
                            <IconButton onClick={emitTextMessage}>
                                <ArrowRight />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
                onFocus={() => {
                    socket.emit('typingStatusChanged', TypingStatus.typing, props.currRoom.roomId, username)
                }}
                onBlur={() => {
                    socket.emit('typingStatusChanged', TypingStatus.notTyping, props.currRoom.roomId, username)
                }}
                value={currInputText}
                fullWidth
                placeholder='Type A Message...'
                onChange={e => setCurrInputText(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' ? emitTextMessage() : null)}
            />

            <MultimediaAttachmentMenu anchorEl={menuAnchor} setAnchorEl={setMenuAnchor} handleUpload={handleUpload} />
        </>
    )
}
