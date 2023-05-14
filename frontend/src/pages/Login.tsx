import { ArrowForward, Fingerprint } from '@mui/icons-material'
import { Button, Container, FormControl, IconButton, Tab, Tabs, TextField } from '@mui/material'
import { useContext, useEffect, useRef, useState } from 'react'
import { TabPanel } from '../components/TabPanel'
import { CredentialContext } from '../contexts/Credentials'
import { Formik, FormikConfig, useFormik } from 'formik'

// const CustomTextField = (props: { value: string; handleChange; helperText }) => {
//     return (
//         <TextField
//             label='name/ email'
//             value={username}
//             onChange={handleChange}
//             error={usernameError}
//             helperText={usernameHelperText}
//             onBlur={() => setUsername(prev => prev.trim())}
//             required
//             onSubmit={e => e.preventDefault()}
//             size='small'
//         />
//     )
// }

const validate = (values: { username: string; password: string }) => {
    const errors: any = {}

    const onlyAlphanumericAndSpecialRegex = /[^\w!@#$%^&*]/

    if (RegExp(onlyAlphanumericAndSpecialRegex).test(values.username) === true) {
        errors.username('username can only contain alphanumeric and !@#$%^&*')
    } else if (values.username.length > 16 || values.username.length < 3) {
        errors.username('Username length must be between 3 and 16 characters')
    }

    if (RegExp(onlyAlphanumericAndSpecialRegex).test(values.password) === true) {
        errors.password('Password can only contain alphanumeric and !@#$%^&*')
    } else if (values.password.length > 50 || values.password.length < 8) {
        errors.password('Password length must be between 10 and 50 characters')
    }

    return errors
}

export const Login = () => {
    const [isLogin, setIsLogin] = useState(true)

    const formType = isLogin ? 'login' : 'signup'

    const selectedTab = isLogin === true ? 0 : 1

    const formik = useFormik({
        initialValues: {
            username: 'password',
            password: 'password',
        },
        validate,
        onSubmit: values => {
            console.log('form submitted with details:', values)
        },
    })

    return (
        <>
            <Tabs value={selectedTab} onChange={() => setIsLogin(!isLogin)} centered>
                <Tab label='Login' />
                <Tab label='Signup' />
            </Tabs>
            {Array(2)
                .fill('')
                .map((_, i) => {
                    return (
                        <TabPanel key={i} value={selectedTab} index={i} handleSubmit={formik.handleSubmit}>
                            <TextField
                                label='username'
                                name='username'
                                value={formik.values.username}
                                onChange={formik.handleChange}
                            />
                            <TextField
                                label='password'
                                name='password'
                                value={formik.values.password}
                                onChange={formik.handleChange}
                            />
                            <>{formik.errors.username}</>
                        </TabPanel>
                    )
                })}
        </>
    )
}

// export const Login = () => {
//     const { isLoggedIn, username: currUsername, handleCredentialChange } = useContext(CredentialContext)
//
//     const [currTab, setCurrTab] = useState<0 | 1>(0) // 0 is login and 1 is signup
//
//     const authMode = useRef<'login' | 'signup'>('login')
//
//     const [usernameHelperText, setUsernameHelperText] = useState('Username must be unique')
//
//     const [passwordHelperText, setPasswordHelperText] = useState('Enter a strong password')
//
//     const [usernameError, setUsernameError] = useState(false)
//
//     const [passwordError, setPasswordError] = useState(false)
//
//     const [username, setUsername] = useState('password')
//
//     const [password, setPassword] = useState('password')
//
//     const handleTabChange = (_: React.SyntheticEvent, newTabValue: 0 | 1) => {
//         setCurrTab(newTabValue)
//         setUsernameError(false)
//         setPasswordError(false)
//         authMode.current = newTabValue === 0 ? 'login' : 'signup'
//     }
//
//     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         setUsername(e.target.value)
//         setUsernameError(false)
//     }
//
//     const handleChangeOnPassword = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         setPassword(e.target.value)
//         setPasswordError(false)
//     }
//
//     const isUsernameValid = () => {
//         // Checks if string has characters other than alphabet, numbers, and some special characters
//         const onlyAlphanumericAndSpecialRegex = /[^\w!@#$%^&*]/
//
//         if (RegExp(onlyAlphanumericAndSpecialRegex).test(username) === true) {
//             setUsernameError(true)
//             setUsernameHelperText('username can only contain alphanumeric and !@#$%^&*')
//             return false
//         } else if (username.length > 16 || username.length < 3) {
//             setUsernameError(true)
//             setUsernameHelperText('Username length must be between 3 and 16 characters')
//             return false
//         }
//         return true
//     }
//
//     const isPasswordValid = () => {
//         // Checks if string has characters other than alphabet, numbers, and some special characters
//         const onlyAlphanumericAndSpecialRegex = /[^\w!@#$%^&*]/
//
//         if (RegExp(onlyAlphanumericAndSpecialRegex).test(password) === true) {
//             setPasswordError(true)
//             setPasswordHelperText('Password can only contain alphanumeric and !@#$%^&*')
//             return false
//         } else if (password.length > 50 || password.length < 8) {
//             setPasswordError(true)
//             setPasswordHelperText('Password length must be between 10 and 50 characters')
//             return false
//         }
//         return true
//     }
//
//     const handleFetchResponse = (statusCode: number) => {
//         switch (statusCode) {
//             case 200:
//                 //
//                 break
//
//             default:
//                 break
//         }
//     }
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault()
//
//         if (isUsernameValid() === false || isPasswordValid() === false) return false
//
//         const URL = import.meta.env.PROD ? import.meta.env.VITE_SERVER_PROD_URL : import.meta.env.VITE_SERVER_DEV_URL
//
//         const response = await fetch(`${URL}/${authMode.current}`, {
//             body: JSON.stringify({ username, password }),
//             method: 'POST',
//             // credentials: 'include',
//             headers: {
//                 Accept: 'application/json',
//                 'Content-Type': 'application/json',
//             },
//         })
//         switch (response.status) {
//             case 409:
//                 setUsernameError(true)
//                 setUsernameHelperText('Username taken')
//                 break
//             case 200:
//                 handleCredentialChange(username)
//
//             default:
//                 break
//         }
//
//         console.log(await response.text())
//     }
//
//     return (
//         <>
//             <Tabs value={currTab} onChange={handleTabChange} centered>
//                 <Tab label='Login' />
//                 <Tab label='Signup' />
//             </Tabs>
//
//             <TabPanel value={currTab} index={0} handleSubmit={handleSubmit}>
//                 <TextField
//                     label='name/ email'
//                     value={username}
//                     onChange={handleChange}
//                     error={usernameError}
//                     helperText={usernameHelperText}
//                     onBlur={() => setUsername(prev => prev.trim())}
//                     required
//                     onSubmit={e => e.preventDefault()}
//                     size='small'
//                 />
//                 <TextField
//                     label='password'
//                     value={password}
//                     onChange={handleChangeOnPassword}
//                     helperText={passwordHelperText}
//                     error={passwordError}
//                     type={'password'}
//                     required
//                     onSubmit={e => e.preventDefault()}
//                     size='small'
//                 />
//                 <Button type='submit' endIcon={<ArrowForward />}>
//                     login
//                 </Button>
//             </TabPanel>
//
//             <TabPanel value={currTab} index={1} handleSubmit={handleSubmit}>
//                 <TextField
//                     label='name/ email'
//                     value={username}
//                     onChange={handleChange}
//                     onSubmit={e => e.preventDefault()}
//                     helperText={usernameHelperText}
//                     onBlur={() => setUsername(prev => prev.trim())}
//                     size='small'
//                     required
//                     error={usernameError}
//                 />
//                 <TextField
//                     label='password'
//                     value={password}
//                     onChange={handleChangeOnPassword}
//                     onSubmit={e => e.preventDefault()}
//                     helperText={passwordHelperText}
//                     error={passwordError}
//                     required
//                     size='small'
//                     type={'password'}
//                 />
//                 <Button type='submit' endIcon={<ArrowForward />}>
//                     signup
//                 </Button>
//             </TabPanel>
//         </>
//     )
// }
