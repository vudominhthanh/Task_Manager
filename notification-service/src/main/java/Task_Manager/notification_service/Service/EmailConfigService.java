package Task_Manager.notification_service.Service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.Properties;

@Service
@Slf4j
public class EmailConfigService {

    private SmtpConfig currentConfig = new SmtpConfig(
            25, ".pdf, .png, .jpg, .docx, .zip", "smtp.gmail.com", "587", "thanhvu0268108@gmail.com", "qikz kovp hmke oacv", false
    );

    private JavaMailSenderImpl mailSender;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SmtpConfig {
        private Integer maxFileSizeMb;
        private String allowedExtensions;
        private String smtpHost;
        private String smtpPort;
        private String smtpEmail;
        private String smtpPassword;
        private Boolean systemMaintenance;
    }

    @PostConstruct
    public void init() {
        updateConfig(this.currentConfig);
        log.info("✅ MailSender đã được khởi tạo tự động lúc startup.");
    }

    public SmtpConfig getCurrentConfig() {
        return this.currentConfig;
    }

    public synchronized void updateConfig(SmtpConfig newConfig) {
        this.currentConfig = newConfig;

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(newConfig.getSmtpHost());
        sender.setPort(Integer.parseInt(newConfig.getSmtpPort()));
        sender.setUsername(newConfig.getSmtpEmail());
        sender.setPassword(newConfig.getSmtpPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");

        this.mailSender = sender;
//        log.info("✅ SMTP Re-configured: Host={}, Email={}", newConfig.getSmtpHost(), newConfig.getSmtpEmail());
    }

    public void sendOtp(String toEmail,String otp, String fullName) {
        if (this.mailSender == null || currentConfig.getSmtpPassword() == null || currentConfig.getSmtpPassword().isBlank()) {
            log.warn("⚠️ Bỏ qua gửi SMTP thực tế vì chưa cấu hình. Mã OTP: {}", otp);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(currentConfig.getSmtpEmail());
            message.setTo(toEmail);
            message.setSubject("[WorkFlow] Mã xác nhận hệ thống");
            message.setText("Xin chào " + fullName + ",\nMã OTP của bạn là: " + otp + "\nHiệu lực trong 5 phút.");

            mailSender.send(message);
        } catch (Exception e) {
            log.error("❌ Lỗi gửi SMTP: {}", e.getMessage());
        }
    }

    public boolean sendEmail(String toEmail, String subject, String textBody) {
        if (this.mailSender == null || currentConfig.getSmtpPassword() == null
                || currentConfig.getSmtpPassword().isBlank()
                || currentConfig.getSmtpPassword().equals("MẬT_KHẨU_ỨNG_DỤNG_CỦA_BẠN")) {

            log.warn("⚠️ Bỏ qua gửi SMTP tới {} vì chưa cấu hình mật khẩu hợp lệ.", toEmail);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(currentConfig.getSmtpEmail());
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(textBody);

            mailSender.send(message);
            return true;
        } catch (Exception e) {
            log.error("❌ Lỗi gửi SMTP tới {}: {}", toEmail, e.getMessage());
            return false;
        }
    }
}