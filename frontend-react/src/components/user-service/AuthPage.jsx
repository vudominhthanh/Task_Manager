import React, { useState, useEffect } from "react";
import axios from "axios";
import apiClient from "../../utils/apiClient";
import { toast } from "react-hot-toast";
import "./AuthPage.css";

const AuthPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState(1); 
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loginData, setLoginData] = useState({
    emailOrUsername: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    fullname: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const API_BASE_URL = "http://localhost:8086/api/auth";

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang đăng nhập...");

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        emailOrUsername: loginData.emailOrUsername,
        password: loginData.password,
      });

      const data = response.data;

      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data));

      toast.success("Đăng nhập thành công!", { id: toastId });
      
      setTimeout(() => {
        window.location.href = "/Home";
      }, 1000);
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Email/Tên đăng nhập hoặc mật khẩu không đúng!";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang chuẩn bị gửi mã OTP...");

    try {
      const response = await axios.post(`${API_BASE_URL}/register/init`, registerData);
      
      toast.success(response.data?.message || "Mã xác thực OTP đã được gửi đến email của bạn!", { id: toastId });
      setRegisterStep(2);
      setCountdown(60);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi khi gửi yêu cầu xác thực!";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số OTP!");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Đang xác thực OTP...");

    try {
      const payload = {
        ...registerData,
        otp: otp.trim(),
      };

      const response = await axios.post(`${API_BASE_URL}/register/verify`, payload);
      const data = response.data;

      toast.success("Kích hoạt tài khoản thành công!", { id: toastId });
      
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      setTimeout(() => {
        window.location.href = "/Home";
      }, 1500);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn!";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit}>
      <div className="input-group">
        <label>Email hoặc Tên người dùng</label>
        <input
          type="text"
          name="emailOrUsername"
          placeholder="Nhập email hoặc username..."
          value={loginData.emailOrUsername}
          onChange={handleLoginChange}
          required
        />
      </div>
      <div className="input-group">
        <label>Mật khẩu</label>
        <input
          type="password"
          name="password"
          placeholder="Nhập mật khẩu..."
          value={loginData.password}
          onChange={handleLoginChange}
          required
        />
      </div>
      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? "Đang xử lý..." : "Đăng Nhập"}
      </button>
      <div className="auth-switch">
        Chưa có tài khoản?{" "}
        <span
          onClick={() => {
            setIsRegistering(true);
            setRegisterStep(1);
          }}
        >
          Đăng ký ngay
        </span>
      </div>
    </form>
  );

  const renderRegisterFormStep1 = () => (
    <form onSubmit={handleInitiateRegister}>
      <div className="input-group">
        <label>Họ và Tên</label>
        <input
          type="text"
          name="fullname"
          placeholder="Ví dụ: Nguyễn Văn A"
          value={registerData.fullname}
          onChange={handleRegisterChange}
          required
        />
      </div>
      <div className="input-group">
        <label>Tên đăng nhập (Username)</label>
        <input
          type="text"
          name="username"
          placeholder="Ví dụ: nguyenvana"
          value={registerData.username}
          onChange={handleRegisterChange}
          required
        />
      </div>
      <div className="input-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          placeholder="nguyenvana@gmail.com"
          value={registerData.email}
          onChange={handleRegisterChange}
          required
        />
      </div>
      <div className="input-group">
        <label>Số điện thoại</label>
        <input
          type="tel"
          name="phoneNumber"
          placeholder="+84..."
          value={registerData.phoneNumber}
          onChange={handleRegisterChange}
          required
        />
      </div>
      <div className="input-group">
        <label>Mật khẩu</label>
        <input
          type="password"
          name="password"
          placeholder="Tạo mật khẩu an toàn..."
          value={registerData.password}
          onChange={handleRegisterChange}
          required
        />
      </div>
      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? "Đang gửi OTP..." : "Đăng kí"}
      </button>
      <div className="auth-switch">
        Đã có tài khoản?{" "}
        <span
          onClick={() => {
            setIsRegistering(false);
            setRegisterStep(1);
          }}
        >
          Về trang Đăng nhập
        </span>
      </div>
    </form>
  );

  const renderRegisterFormStep2 = () => (
    <form onSubmit={handleVerifyOtpSubmit}>
      <div className="input-group">
        <label>Mã xác thực OTP (6 chữ số)</label>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 8px" }}>
          Mã xác thực đã được gửi tới <b>{registerData.email}</b>
        </p>
        <input
          type="text"
          maxLength="6"
          autoFocus
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          style={{
            textAlign: "center",
            letterSpacing: "8px",
            fontSize: "22px",
            fontWeight: "bold",
          }}
          required
        />
      </div>

      <button
        type="submit"
        className="btn-submit"
        disabled={loading || otp.length !== 6}
      >
        {loading ? "Đang xác thực..." : "Kích hoạt tài khoản"}
      </button>

      <div
        className="auth-switch"
        style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}
      >
        <span onClick={() => setRegisterStep(1)}>← Đổi thông tin</span>
        <span
          onClick={countdown === 0 && !loading ? handleInitiateRegister : undefined}
          style={{
            cursor: countdown === 0 ? "pointer" : "not-allowed",
            opacity: countdown === 0 ? 1 : 0.6,
          }}
        >
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã"}
        </span>
      </div>
    </form>
  );

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">✓</div>
            WorkFlow
          </div>
          <h2 className="auth-title">
            {isRegistering
              ? registerStep === 1
                ? "Tạo tài khoản mới"
                : "Xác thực Email"
              : "Chào mừng trở lại"}
          </h2>
          <p className="auth-subtitle">
            {isRegistering
              ? registerStep === 1
                ? "Điền thông tin để tham gia hệ thống"
                : "Nhập mã xác thực gồm 6 số để hoàn tất"
              : "Đăng nhập để quản lý công việc của bạn"}
          </p>
        </div>

        {isRegistering
          ? registerStep === 1
            ? renderRegisterFormStep1()
            : renderRegisterFormStep2()
          : renderLoginForm()}
      </div>
    </div>
  );
};

export default AuthPage;