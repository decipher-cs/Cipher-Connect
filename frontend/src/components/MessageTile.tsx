import { Dialog, Paper, Typography } from '@mui/material'
import { useState } from 'react'
import { MessageContentType } from '../types/prisma.client'

export const MessageTile = (props: {
    content: string
    messageContentType: MessageContentType
    alignment: 'left' | 'right'
    autoScrollToBottomRef: React.RefObject<HTMLDivElement> | null
}) => {
    const [showDialog, setShowDialog] = useState(false)

    if (props.content.length <= 0) return null

    const MessageContent = () => {
        if (props.messageContentType === MessageContentType.audio) return <audio controls src={props.content} />
        if (props.messageContentType === MessageContentType.text)
            return <Typography sx={{ overflowWrap: 'break-word', color: 'white' }}>{props.content}</Typography>
        if (props.messageContentType === MessageContentType.video)
            return <video src={props.content} controls style={{ maxHeight: '30svh' }} />
        if (props.messageContentType === MessageContentType.image) {
            return (
                <>
                    <img
                        src={props.content}
                        loading='lazy'
                        style={{
                            maxHeight: '30svh',
                            maxWidth: '100%',
                        }}
                        onClick={() => setShowDialog(true)}
                    />
                    <Dialog open={showDialog} onClick={() => setShowDialog(false)}>
                        <img src={props.content} />
                    </Dialog>
                </>
            )
        }
        return null
    }

    return (
        <Paper
            sx={{
                borderRadius: props.alignment === 'left' ? '0px 45px 45px 45px' : '45px 0px 45px 45px',
                px: 4,
                py: 3,
                justifySelf: props.alignment === 'left' ? 'flex-start' : 'flex-end',
                width: 'fit-content',
                maxWidth: '80%',
                backgroundImage: 'linear-gradient(45deg,#3023AE 0%,#FF0099 100%)',
            }}
            ref={props.autoScrollToBottomRef}
        >
            <MessageContent />
        </Paper>
    )
}
