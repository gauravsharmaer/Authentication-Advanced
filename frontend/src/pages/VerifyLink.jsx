import axios from "axios";
import React from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { useEffect } from "react";
const VerifyLink = () => {
  const [suceessMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useParams();
  const verifyUser = async () => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/verify/${params.token}`
      );
      setSuccessMsg(data.message);
    } catch (error) {
      console.log(error);
      setErrorMsg("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUser();
  }, []);
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <div>
          {suceessMsg && <p>{suceessMsg}</p>}
          <div>{errorMsg && <p>{errorMsg}</p>}</div>
        </div>
      )}
    </>
  );
};

export default VerifyLink;
