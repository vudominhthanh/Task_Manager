package Task_Manager.activity_service.repository;

import Task_Manager.activity_service.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, String> {
    List<Activity> findByOrderByCreatedAtDesc();

    List<Activity> findByProjectIdOrderByCreatedAtDesc(String projectId);

    List<Activity> findByTargetIdOrderByCreatedAtDesc(String targetId);
    List<Activity> findTop5ByUserIdOrderByCreatedAtDesc(String userId);


}
