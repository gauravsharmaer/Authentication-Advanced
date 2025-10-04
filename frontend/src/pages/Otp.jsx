import React, { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const Otp = () => {
  const [otp, setOtp] = useState(new Array(6).fill("")); // 6 digits
  const inputRefs = useRef([]);
  const [btnLoading, setBtnLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, setUser } = useAppContext(); // <-- get setter from context

  const email = localStorage.getItem("email");

  const handleChange = (value, index) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // move focus to next input if value entered
      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBtnLoading(true);

    try {
      const finalOtp = otp.join(""); // convert array to string
      console.log("Entered OTP:", finalOtp);

      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/verify`,
        {
          email,
          otp: finalOtp, // send OTP as string
        },
        {
          withCredentials: true,
        }
      );
      toast.success(data.message);
      localStorage.removeItem("email");
      setAuth(true); // <-- set isAuth to true
      setUser(data.user);
      navigate("/"); // <-- Add this line to redirect to home
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-gray-50 py-12">
      <div className="relative bg-white px-6 pt-10 pb-9 shadow-xl mx-auto w-full max-w-lg rounded-2xl">
        <div className="mx-auto flex w-full max-w-md flex-col space-y-16">
          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="font-semibold text-3xl">
              <p>Email Verification</p>
            </div>
            <div className="flex flex-row text-sm font-medium text-gray-400">
              <p>
                We have sent a code to your email{" "}
                <span className="font-medium text-gray-600">
                  {email || "your email"}
                </span>
              </p>
            </div>
          </div>

          {/* OTP Form */}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-16">
              {/* OTP Inputs */}
              <div className="flex flex-row items-center justify-between mx-auto w-full max-w-xs">
                {otp.map((digit, index) => (
                  <div key={index} className="w-12 h-12 sm:w-14 sm:h-14">
                    <input
                      ref={(el) => (inputRefs.current[index] = el)}
                      className="w-full h-full text-center px-2 outline-none rounded-xl border border-gray-200 text-lg bg-white focus:bg-gray-50 focus:ring-1 ring-blue-700"
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                    />
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-col space-y-5">
                <button
                  type="submit"
                  className="flex items-center justify-center w-full rounded-xl py-3 sm:py-4 bg-blue-700 text-white text-sm shadow-sm hover:bg-blue-800"
                  disabled={btnLoading}
                >
                  {btnLoading ? "Loading..." : "Verify Account"}
                </button>

                <div className="flex items-center justify-center text-sm font-medium space-x-1 text-gray-500">
                  <p>Didn't receive code?</p>
                  <button
                    type="button"
                    onClick={() => alert("Resend OTP")}
                    className="text-blue-600 hover:underline"
                  >
                    Resend
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Otp;
