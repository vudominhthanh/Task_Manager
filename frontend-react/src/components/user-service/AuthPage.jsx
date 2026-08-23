import React, { useState } from "react";
import axios from "axios";
import "./AuthPage.css";

const AuthPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);

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

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        emailOrUsername: loginData.emailOrUsername,
        password: loginData.password,
      });

      const data = response.data.data;

      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      window.location.href = "/Home";
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi kết nối Server!";
      alert(errorMsg);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_BASE_URL}/register`,
        registerData,
      );

      alert("Đăng ký thành công! Hãy đăng nhập nhé.");
      setIsRegistering(false); 
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi đăng ký!";
      alert("Đăng ký thất bại: " + errorMsg);
    }
  };

  // Giao diện Form Login
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
      <button type="submit" className="btn-submit">
        Đăng Nhập
      </button>
      <div className="auth-switch">
        Chưa có tài khoản?{" "}
        <span onClick={() => setIsRegistering(true)}>Đăng ký ngay</span>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegisterSubmit}>
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
      <button type="submit" className="btn-submit">
        Tạo Tài Khoản
      </button>
      <div className="auth-switch">
        Đã có tài khoản?{" "}
        <span onClick={() => setIsRegistering(false)}>Về trang Đăng nhập</span>
      </div>
    </form>
  );

  return (
    <div className="auth-layout">
      <div className="auth-card">
        {/* Phần Logo giả lập theo bản thiết kế */}
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">✓</div>
            WorkFlow
          </div>
          <h2 className="auth-title">
            {isRegistering ? "Tạo tài khoản mới" : "Chào mừng trở lại"}
          </h2>
          <p className="auth-subtitle">
            {isRegistering
              ? "Điền thông tin để tham gia hệ thống"
              : "Đăng nhập để quản lý công việc của bạn"}
          </p>
        </div>

        {/* Gọi hàm render form dựa vào state */}
        {isRegistering ? renderRegisterForm() : renderLoginForm()}
      </div>
    </div>
  );
};

export default AuthPage;
