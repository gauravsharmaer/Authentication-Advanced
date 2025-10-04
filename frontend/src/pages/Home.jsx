import React from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate, Link } from "react-router-dom";
const Home = () => {
  const { logoutUser, getTest, user } = useAppContext();
  const navigate = useNavigate();
  return (
    <div className="flex w-[100px] m-auto mt-40">
      <button
        className="bg-red-500 text-white p-2 rounded-md"
        onClick={() => logoutUser(navigate)}
      >
        Logout
      </button>

      <button onClick={() => getTest()}>get</button>

      {user && user.role == "admin" && (
        <>
          <h1>i am admin</h1>
          <Link to="/dashboard">admin dashbaord</Link>
        </>
      )}
    </div>
  );
};

export default Home;
