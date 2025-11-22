// import React, { useState } from "react";
// import { Sparkles, Loader2 } from "lucide-react";
// import { Link } from "react-router-dom";

// export default function Register() {
//   const [loading, setLoading] = useState(false);
//   const [form, setForm] = useState({
//     fullName: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });

//   const handleRegister = () => {
//     setLoading(true);
//     setTimeout(() => {
//       alert("Account created successfully!");
//       window.location.href = "/login";
//       setLoading(false);
//     }, 1200);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center p-6">
//       <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        
//         <div className="text-center mb-8">
//           <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
//             <Sparkles className="text-white" size={32} />
//           </div>
//           <h1 className="text-3xl font-bold mt-4">Create Account</h1>
//         </div>

//         <div className="space-y-4">
//           <input
//             type="text"
//             placeholder="Full Name"
//             className="w-full p-3 border rounded-lg"
//             onChange={(e) => setForm({ ...form, fullName: e.target.value })}
//           />
//           <input
//             type="email"
//             placeholder="Email"
//             className="w-full p-3 border rounded-lg"
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             className="w-full p-3 border rounded-lg"
//             onChange={(e) => setForm({ ...form, password: e.target.value })}
//           />
//           <input
//             type="password"
//             placeholder="Confirm Password"
//             className="w-full p-3 border rounded-lg"
//             onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
//           />

//           <button
//             onClick={handleRegister}
//             className="bg-indigo-600 w-full py-3 rounded-lg text-white font-semibold flex justify-center items-center"
//           >
//             {loading ? <Loader2 className="animate-spin" /> : "Register"}
//           </button>
//         </div>

//         <p className="text-center text-gray-600 mt-4">
//           Already have an account?
//           <Link to="/login" className="text-indigo-600 font-semibold ml-1">
//             Login
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// } // old code above


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Registration successful!");
        navigate("/login"); // ✅ redirect after success
      } else {
        alert(data.detail || "Registration failed");
      }
    } catch (err) {
      alert("Error registering: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold mt-4">Create Account</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 border rounded-lg"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 border rounded-lg"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="bg-indigo-600 w-full py-3 rounded-lg text-white font-semibold flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Register"}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-4">
          Already have an account?
          <Link to="/login" className="text-indigo-600 font-semibold ml-1">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}