// src/app/App.jsx

import {
  BrowserRouter,
} from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AppRoutes from "./routes";

import {
  AuthProvider,
} from "../context/AuthContext";


function App() {
  return (
    <AuthProvider>

      <BrowserRouter>

        <div className="app">

          <Navbar />

          <main className="app-content">
            <AppRoutes />
          </main>

          <Footer />

        </div>

      </BrowserRouter>

    </AuthProvider>
  );
}


export default App;