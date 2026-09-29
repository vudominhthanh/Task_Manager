package Task_Manager.task_service.service.impl;

import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class TaskProgressEngine {

    private static final BigDecimal DEFAULT_MIN_EFFORT = BigDecimal.ONE;

    public void calculateRollupMetrics(Task parentTask, List<Task> subTasks) {
        if (subTasks == null || subTasks.isEmpty()) {
            return;
        }

        BigDecimal totalEstimatedEffort = BigDecimal.ZERO;
        BigDecimal totalActualEffort = BigDecimal.ZERO;
        BigDecimal weightedSum = BigDecimal.ZERO;

        for (Task sub : subTasks) {
            BigDecimal effort = getValidEffort(sub.getEstimatedEffort());
            totalEstimatedEffort = totalEstimatedEffort.add(effort);

            if (sub.getActualEffort() != null) {
                totalActualEffort = totalActualEffort.add(sub.getActualEffort());
            }
        }

        for (Task sub : subTasks) {
            BigDecimal subEffort = getValidEffort(sub.getEstimatedEffort());
            BigDecimal subProgress = resolveEffectiveProgress(sub);

            weightedSum = weightedSum.add(subProgress.multiply(subEffort));
        }

        BigDecimal calculatedPercentage = BigDecimal.ZERO;
        if (totalEstimatedEffort.compareTo(BigDecimal.ZERO) > 0) {
            calculatedPercentage = weightedSum.divide(totalEstimatedEffort, 2, RoundingMode.HALF_UP);
        }

        if (calculatedPercentage.compareTo(BigDecimal.valueOf(100)) > 0) {
            calculatedPercentage = BigDecimal.valueOf(100);
        }

        parentTask.setEstimatedEffort(totalEstimatedEffort);
        parentTask.setActualEffort(totalActualEffort);
        parentTask.setCompletionPercentage(calculatedPercentage);
    }

    public void enrichSubTaskContributions(TaskResponse parentResponse) {
        if (parentResponse == null || parentResponse.getSubTasks() == null || parentResponse.getSubTasks().isEmpty()) {
            return;
        }

        List<TaskResponse> subTasks = parentResponse.getSubTasks();
        BigDecimal totalEffort = BigDecimal.ZERO;

        for (TaskResponse sub : subTasks) {
            totalEffort = totalEffort.add(getValidEffort(sub.getEstimatedEffort()));
        }

        if (totalEffort.compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal equalShare = BigDecimal.valueOf(100.0)
                    .divide(BigDecimal.valueOf(subTasks.size()), 2, RoundingMode.HALF_UP);
            subTasks.forEach(st -> st.setContributionPercentage(equalShare));
            return;
        }

        for (TaskResponse sub : subTasks) {
            BigDecimal subEffort = getValidEffort(sub.getEstimatedEffort());
            BigDecimal share = subEffort.divide(totalEffort, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            sub.setContributionPercentage(share);
        }
    }

    private BigDecimal resolveEffectiveProgress(Task sub) {
        if (sub.getStatus() == TaskStatus.DONE) {
            return BigDecimal.valueOf(100.00);
        }
        if (sub.getStatus() == TaskStatus.TO_DO) {
            return BigDecimal.ZERO;
        }
        if (sub.getCompletionPercentage() != null && sub.getCompletionPercentage().compareTo(BigDecimal.ZERO) > 0) {
            return sub.getCompletionPercentage();
        }
        if (sub.getStatus() == TaskStatus.REVIEW) return BigDecimal.valueOf(80.00);
        if (sub.getStatus() == TaskStatus.IN_PROGRESS) return BigDecimal.valueOf(20.00);

        return BigDecimal.ZERO;
    }

    private BigDecimal getValidEffort(BigDecimal effort) {
        return (effort != null && effort.compareTo(BigDecimal.ZERO) > 0) ? effort : DEFAULT_MIN_EFFORT;
    }

    public boolean evaluateParentStatusSync(Task parentTask, List<Task> subTasks) {
        if (subTasks == null || subTasks.isEmpty()) {
            return false;
        }

        boolean allDone = subTasks.stream().allMatch(st -> st.getStatus() == TaskStatus.DONE);
        boolean anyStarted = subTasks.stream().anyMatch(st ->
                st.getStatus() == TaskStatus.IN_PROGRESS || st.getStatus() == TaskStatus.REVIEW || st.getStatus() == TaskStatus.DONE);

        TaskStatus oldStatus = parentTask.getStatus();

        if (allDone) {
            parentTask.setStatus(TaskStatus.DONE);
            parentTask.setCompletionPercentage(BigDecimal.valueOf(100.00));
            if (parentTask.getCompletedAt() == null) {
                parentTask.setCompletedAt(LocalDateTime.now());
            }
        } else if (anyStarted && parentTask.getStatus() == TaskStatus.TO_DO) {
            parentTask.setStatus(TaskStatus.IN_PROGRESS);
            parentTask.setCompletedAt(null);
        } else if (!allDone && parentTask.getStatus() == TaskStatus.DONE) {
            parentTask.setStatus(TaskStatus.IN_PROGRESS);
            parentTask.setCompletedAt(null);
        }

        return oldStatus != parentTask.getStatus();
    }
}