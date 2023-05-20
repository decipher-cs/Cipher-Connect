import { Typography } from '@mui/material'
import { useContext, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// import './App.css'
import { Navbar } from './components/Navbar'
import { RequireAuth } from './components/RequireAuth'
import { CredentialContext, CredentialContextProvider } from './contexts/Credentials'
import { Chat } from './pages/Chat'
import { Home } from './pages/Home'
import { Login } from './pages/Login'

const TempUsernameDisplay = () => {
    const { username, isLoggedIn } = useContext(CredentialContext)
    return <Typography>{isLoggedIn === true ? <>you are logged in as: {username}</> : <>Not logged in</>}</Typography>
}

function App() {
    const { setUserUsername } = useContext(CredentialContext)

    useEffect(() => {
        const username = window.localStorage.getItem('username')

        if (username === null) return

        const varifyUser = async () => {
            const URL = import.meta.env.PROD
                ? import.meta.env.VITE_SERVER_PROD_URL
                : import.meta.env.VITE_SERVER_DEV_URL

            const response = await fetch(`${URL}/varifyRefreshToken`, {
                body: JSON.stringify({ username }),
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            })
            if (response.statusText === 'OK') setUserUsername(username)
        }

        varifyUser()

        return () => {}
    }, [])
    return (
        <CredentialContextProvider>
            <BrowserRouter>
                <Navbar redirectionPaths={['home', 'login', 'chat']} />
                <TempUsernameDisplay />

                <Routes>
                    <Route path='/home' element={<Home />} />
                    <Route
                        path='/chat'
                        element={
                            <RequireAuth>
                                <Chat />
                            </RequireAuth>
                        }
                    />
                    <Route path='/login' element={<Login />} />
                    <Route path='*' element={<Navigate to='/home' replace />} />
                </Routes>
            </BrowserRouter>
        </CredentialContextProvider>
    )
}

export default App
