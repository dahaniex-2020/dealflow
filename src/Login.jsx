import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const Login = ({ setIsLoggedIn }) => {
  const [isLogin, setIsLogin] = useState(true); // True = Login, False = Sign Up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const auth = getAuth();

    try {
      if (isLogin) {
        // 👇 LOGIN LOGIC
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 👇 SIGN UP LOGIC (Create New Account)
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully! You can now log in.");
        setIsLogin(true); // Switch back to login form after successful signup
        setLoading(false);
        return;
      }

      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
      navigate('/dashboard'); 
    } catch (err) {
      // Readable error messages
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please log in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password must be at least 6 characters long.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else {
        setError("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isLogin ? "Login to DealFlow" : "Create an Account"}
        </h2>
        
        {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:bg-blue-400"
          >
            {loading ? "Processing..." : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        {/* Toggle Button */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(""); // Clear errors when switching forms
              setEmail("");
              setPassword("");
            }}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;