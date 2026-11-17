import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import CRMApp from './CRMApp'

export default function App() {
  return <BrowserRouter><AuthProvider><CRMApp /></AuthProvider></BrowserRouter>
}
