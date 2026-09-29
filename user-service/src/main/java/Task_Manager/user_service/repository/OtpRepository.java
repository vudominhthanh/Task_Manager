package Task_Manager.user_service.repository;

import Task_Manager.user_service.entity.Otp;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface OtpRepository extends CrudRepository<Otp, String> {
    List<Otp> findByUserIdAndTypeAndUsedFalse(UUID userId, String type);
}
