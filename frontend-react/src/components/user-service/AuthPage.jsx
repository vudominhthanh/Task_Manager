import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { Check } from "lucide-react";

const AuthPage = () => {
  const [authMode, setAuthMode] = useState("LOGIN");
  const [step, setStep] = useState(1);
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

  const [forgotPwdData, setForgotPwdData] = useState({
    email: "",
    newPassword: "",
  });

  const API_BASE_URL = "http://localhost:8086/api/auth";

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  const handleForgotPwdChange = (e) => setForgotPwdData({ ...forgotPwdData, [e.target.name]: e.target.value });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang đăng nhập...");

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        emailOrUsername: loginData.emailOrUsername,
        password: loginData.password,
      });
      saveSessionAndRedirect(response.data, toastId);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Email/Tên đăng nhập hoặc mật khẩu không đúng!";

      if (errorMsg.toLowerCase().includes("2 bước") || errorMsg.toLowerCase().includes("2fa") || error.response?.status === 403) {
        toast.dismiss(toastId);
        setOtp("");
        setAuthMode("VERIFY_2FA");
        return;
      }
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FaSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Vui lòng nhập đủ 6 số mã xác thực 2FA!");

    setLoading(true);
    const toastId = toast.loading("Đang xác thực bảo mật 2 lớp...");
    try {
      const response = await axios.post(`${API_BASE_URL}/login/2fa-verify`, {
        userId: loginData.emailOrUsername,
        code: otp.trim(),
      });
      saveSessionAndRedirect(response.data, toastId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã 2FA không chính xác!", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const toastId = toast.loading("Đang xác thực với Google...");
    try {
      const response = await axios.post(`${API_BASE_URL}/login/google`, {
        idToken: credentialResponse.credential,
      });
      saveSessionAndRedirect(response.data, toastId);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đăng nhập Google thất bại!";

      if (errorMsg.toLowerCase().includes("2 bước") || errorMsg.toLowerCase().includes("2fa") || error.response?.status === 403) {
        toast.dismiss(toastId);
        setOtp("");
        const payload = JSON.parse(atob(credentialResponse.credential.split(".")[1]));
        setLoginData({ ...loginData, emailOrUsername: payload.email });
        setAuthMode("VERIFY_2FA");
        return;
      }
      toast.error(errorMsg, { id: toastId });
    }
  };

  const handleGoogleError = () => {
    toast.error("Google Auth bị đóng hoặc xảy ra sự cố!");
  };

  const handleInitiateRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Đang gửi mã xác thực...");

    try {
      const response = await axios.post(`${API_BASE_URL}/register/init`, registerData);
      toast.success(response.data?.message || "Mã xác thực OTP đã được gửi đến email của bạn!", { id: toastId });
      setStep(2);
      setCountdown(60);
      setOtp("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu đăng ký!", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Vui lòng nhập đủ 6 chữ số OTP!");

    setLoading(true);
    const toastId = toast.loading("Đang tạo tài khoản...");
    try {
      const payload = {
        email: registerData.email,
        otp: otp.trim(),
        password: registerData.password,
      };
      const response = await axios.post(`${API_BASE_URL}/register/verify`, payload);
      toast.success("Kích hoạt tài khoản thành công!", { id: toastId });
      saveSessionAndRedirect(response.data, null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn!", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPwdInit = async (e) => {
    if (e) e.preventDefault();
    if (!forgotPwdData.email) return toast.error("Vui lòng nhập email!");

    setLoading(true);
    const toastId = toast.loading("Đang gửi mã khôi phục...");
    try {
      const response = await axios.post(`${API_BASE_URL}/password/forgot`, { email: forgotPwdData.email });
      toast.success(response.data?.message || "Mã khôi phục đã được gửi!", { id: toastId });
      setStep(2);
      setCountdown(60);
      setOtp("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Email không tồn tại trong hệ thống!", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPwdReset = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Vui lòng nhập đủ 6 chữ số OTP!");
    if (forgotPwdData.newPassword.length < 6) return toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");

    setLoading(true);
    const toastId = toast.loading("Đang đặt lại mật khẩu...");
    try {
      const response = await axios.post(`${API_BASE_URL}/password/reset`, {
        email: forgotPwdData.email,
        otp: otp.trim(),
        newPassword: forgotPwdData.newPassword,
      });
      toast.success(response.data?.message || "Đổi mật khẩu thành công!", { id: toastId });
      setAuthMode("LOGIN");
      setLoginData({ ...loginData, emailOrUsername: forgotPwdData.email });
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã OTP không hợp lệ!", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const saveSessionAndRedirect = (data, toastId) => {
    localStorage.setItem("accessToken", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data));

    if (toastId) toast.success("Đăng nhập thành công!", { id: toastId });
    setTimeout(() => { window.location.href = "/"; }, 1000);
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setStep(1);
    setOtp("");
  };

  // ============ STYLE TOKENS (indigo brand cố định) ============
  const inputClass =
    "w-full px-4 py-3 text-[14px] text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  const labelClass = "block text-[13px] font-medium text-gray-800 dark:text-gray-200 mb-1.5";

  const submitBtnClass =
    "w-full py-3 text-[15px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  const switchLinkClass =
    "font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline";

  const otpInputClass =
    "w-full px-4 py-3 text-[22px] font-bold text-center tracking-[8px] text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  // ============ RENDERERS ============
  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Email hoặc Tên người dùng</label>
        <input
          type="text"
          name="emailOrUsername"
          placeholder="Nhập email hoặc username..."
          value={loginData.emailOrUsername}
          onChange={handleLoginChange}
          required
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex justify-between items-center">
          <label className={labelClass}>Mật khẩu</label>
          <span className={`text-[12px] ${switchLinkClass}`} onClick={() => switchMode("FORGOT_PWD")}>
            Quên mật khẩu?
          </span>
        </div>
        <input
          type="password"
          name="password"
          placeholder="Nhập mật khẩu..."
          value={loginData.password}
          onChange={handleLoginChange}
          required
          className={inputClass}
        />
      </div>

      <button type="submit" disabled={loading} className={submitBtnClass}>
        {loading ? "Đang xử lý..." : "Đăng Nhập"}
      </button>

      {/* Divider */}
      <div className="flex items-center text-center py-1">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        <span className="px-3 text-[12px] text-gray-400 dark:text-gray-500 font-medium">HOẶC</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="continue_with"
          theme="outline"
          size="large"
          width="100%"
        />
      </div>

      <div className="text-center text-[14px] text-gray-500 dark:text-gray-400 pt-2">
        Chưa có tài khoản?{" "}
        <span className={switchLinkClass} onClick={() => switchMode("REGISTER")}>
          Đăng ký ngay
        </span>
      </div>
    </form>
  );

  const render2FaForm = () => (
    <form onSubmit={handleVerify2FaSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Mã xác thực 2 bước (Authenticator)</label>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 mb-2">
          Tài khoản của bạn đang bật bảo mật 2 lớp. Mở ứng dụng Google Authenticator để lấy mã.
        </p>
        <input
          type="text"
          maxLength="6"
          autoFocus
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
          className={otpInputClass}
        />
      </div>

      <button type="submit" disabled={loading || otp.length !== 6} className={submitBtnClass}>
        {loading ? "Đang xác thực..." : "Xác nhận & Đăng nhập"}
      </button>

      <div className="text-center text-[14px] text-gray-500 dark:text-gray-400 pt-2">
        <span className={switchLinkClass} onClick={() => switchMode("LOGIN")}>
          ← Quay lại Đăng nhập
        </span>
      </div>
    </form>
  );

  const renderRegisterFormStep1 = () => (
    <form onSubmit={handleInitiateRegister} className="space-y-4">
      <div>
        <label className={labelClass}>Họ và Tên</label>
        <input type="text" name="fullname" placeholder="VD: Nguyễn Văn A" value={registerData.fullname} onChange={handleRegisterChange} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Tên đăng nhập</label>
        <input type="text" name="username" placeholder="VD: nguyenvana" value={registerData.username} onChange={handleRegisterChange} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" name="email" placeholder="nguyenvana@gmail.com" value={registerData.email} onChange={handleRegisterChange} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Số điện thoại</label>
        <input type="tel" name="phoneNumber" placeholder="0987654..." value={registerData.phoneNumber} onChange={handleRegisterChange} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Mật khẩu</label>
        <input type="password" name="password" placeholder="Tạo mật khẩu an toàn..." value={registerData.password} onChange={handleRegisterChange} required className={inputClass} />
      </div>

      <button type="submit" disabled={loading} className={`${submitBtnClass} !mt-5`}>
        {loading ? "Đang gửi OTP..." : "Đăng ký tài khoản"}
      </button>

      <div className="text-center text-[14px] text-gray-500 dark:text-gray-400 pt-2">
        Đã có tài khoản?{" "}
        <span className={switchLinkClass} onClick={() => switchMode("LOGIN")}>
          Về trang Đăng nhập
        </span>
      </div>
    </form>
  );

  const renderRegisterFormStep2 = () => (
    <form onSubmit={handleVerifyOtpRegister} className="space-y-5">
      <div>
        <label className={labelClass}>Mã xác thực Email (6 số)</label>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 mb-2">
          Mã xác thực đã được gửi tới <b className="text-gray-800 dark:text-gray-200">{registerData.email}</b>
        </p>
        <input
          type="text"
          maxLength="6"
          autoFocus
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
          className={otpInputClass}
        />
      </div>

      <button type="submit" disabled={loading || otp.length !== 6} className={submitBtnClass}>
        {loading ? "Đang xác thực..." : "Kích hoạt tài khoản"}
      </button>

      <div className="flex justify-between text-[13px] pt-2">
        <span className="font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => setStep(1)}>
          ← Đổi thông tin
        </span>
        <span
          onClick={countdown === 0 && !loading ? handleInitiateRegister : undefined}
          className={countdown === 0 ? switchLinkClass : "text-gray-400 dark:text-gray-600 cursor-not-allowed font-semibold"}
        >
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã"}
        </span>
      </div>
    </form>
  );

  const renderForgotPwdStep1 = () => (
    <form onSubmit={handleForgotPwdInit} className="space-y-5">
      <div>
        <label className={labelClass}>Email đăng ký tài khoản</label>
        <input type="email" name="email" placeholder="Nhập email của bạn..." value={forgotPwdData.email} onChange={handleForgotPwdChange} required className={inputClass} />
      </div>

      <button type="submit" disabled={loading} className={submitBtnClass}>
        {loading ? "Đang gửi yêu cầu..." : "Nhận mã khôi phục"}
      </button>

      <div className="text-center text-[14px] text-gray-500 dark:text-gray-400 pt-2">
        <span className={switchLinkClass} onClick={() => switchMode("LOGIN")}>
          ← Quay lại Đăng nhập
        </span>
      </div>
    </form>
  );

  const renderForgotPwdStep2 = () => (
    <form onSubmit={handleForgotPwdReset} className="space-y-4">
      <div>
        <label className={labelClass}>Mã xác thực (6 số)</label>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 mb-2">
          Đã gửi mã tới <b className="text-gray-800 dark:text-gray-200">{forgotPwdData.email}</b>
        </p>
        <input
          type="text"
          maxLength="6"
          autoFocus
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
          className={otpInputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Mật khẩu mới</label>
        <input type="password" name="newPassword" placeholder="Nhập mật khẩu mới..." value={forgotPwdData.newPassword} onChange={handleForgotPwdChange} required className={inputClass} />
      </div>

      <button type="submit" disabled={loading || otp.length !== 6} className={`${submitBtnClass} !mt-5`}>
        {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
      </button>

      <div className="flex justify-between text-[13px] pt-2">
        <span className="font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => switchMode("LOGIN")}>
          ← Hủy
        </span>
        <span
          onClick={countdown === 0 && !loading ? handleForgotPwdInit : undefined}
          className={countdown === 0 ? switchLinkClass : "text-gray-400 dark:text-gray-600 cursor-not-allowed font-semibold"}
        >
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã"}
        </span>
      </div>
    </form>
  );

  // ============ HEADER TEXT ============
  let title = "Chào mừng trở lại";
  let subtitle = "Đăng nhập để quản lý công việc của bạn";
  if (authMode === "REGISTER") {
    title = step === 1 ? "Tạo tài khoản mới" : "Xác thực Email";
    subtitle = step === 1 ? "Điền thông tin để tham gia hệ thống" : "Nhập mã xác thực gồm 6 số để hoàn tất";
  } else if (authMode === "VERIFY_2FA") {
    title = "Xác minh danh tính";
    subtitle = "Bảo mật 2 lớp đang được kích hoạt";
  } else if (authMode === "FORGOT_PWD") {
    title = step === 1 ? "Quên mật khẩu" : "Đặt lại mật khẩu";
    subtitle = step === 1 ? "Nhập email để nhận mã khôi phục" : "Tạo mật khẩu mới cho tài khoản của bạn";
  }

  return (
    <GoogleOAuthProvider clientId="THAY_GOOGLE_CLIENT_ID_CUA_BAN_VAO_DAY.apps.googleusercontent.com">
      <div
        className="min-h-screen w-full flex justify-center items-center p-5 font-sans transition-colors bg-[#f4f7fb] dark:bg-gray-950"
        style={{
          backgroundImage: `
            linear-gradient(rgba(79, 70, 229, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79, 70, 229, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      >
        <div className="w-full max-w-[440px] bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] border border-gray-200 dark:border-gray-800 animate-[slideUpFade_0.5s_ease-out] transition-colors">

          {/* Header & Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4 text-[24px] font-bold text-indigo-600 dark:text-indigo-400">
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center">
                <Check size={18} strokeWidth={3} />
              </div>
              WorkFlow
            </div>
            <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white m-0 mb-2">
              {title}
            </h2>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 m-0">
              {subtitle}
            </p>
          </div>

          {authMode === "LOGIN" && renderLoginForm()}
          {authMode === "VERIFY_2FA" && render2FaForm()}
          {authMode === "REGISTER" && (step === 1 ? renderRegisterFormStep1() : renderRegisterFormStep2())}
          {authMode === "FORGOT_PWD" && (step === 1 ? renderForgotPwdStep1() : renderForgotPwdStep2())}
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </GoogleOAuthProvider>
  );
};

export default AuthPage;