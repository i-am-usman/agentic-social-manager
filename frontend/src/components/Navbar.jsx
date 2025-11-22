// import React from "react";
// import { Sparkles } from "lucide-react";
// import { Link } from "react-router-dom";

// export default function Navbar({ setIsAuthenticated }) {
//   return (
//     <nav className="bg-white shadow-sm border-b border-gray-200">
//       <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
        
//         <div className="flex items-center gap-3">
//           <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
//             <Sparkles className="text-white" size={24} />
//           </div>
//           <span className="text-xl font-bold">Agentic Social Manager</span>
//         </div>

//         <div className="flex items-center gap-4">
//           <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600">
//             Dashboard
//           </Link>
//           <Link to="/generate" className="text-gray-700 hover:text-indigo-600">
//             Create Content
//           </Link>

//           <button
//             onClick={() => setIsAuthenticated(false)}
//             className="text-red-600 font-semibold"
//           >
//             Logout
//           </button>
//         </div>

//       </div>
//     </nav>
//   );
// } // old code above
import React from "react";
import { Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // ✅ Clear JWT token
    localStorage.removeItem("token");
    // ✅ Update auth state
    setIsAuthenticated(false);
    // ✅ Redirect to login
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
        
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold">Agentic Social Manager</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600">
            Dashboard
          </Link>
          <Link to="/generate" className="text-gray-700 hover:text-indigo-600">
            Create Content
          </Link>
          <Link to="/profile" className="text-gray-700 hover:text-indigo-600">
            Profile
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-red-600 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}