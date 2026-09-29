import React from "react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const TaskActivity = ({ activities }) => {
  const { accent } = usePreferences();
  const A = getAccent(accent);

  return (
    <div className="flex flex-col gap-3 text-[12px]">
      {activities.length === 0 ? (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-6">
          Chưa có lịch sử hoạt động.
        </div>
      ) : (
        activities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-2.5 text-gray-600 dark:text-gray-300 pb-3 border-b border-gray-100 dark:border-gray-700/60 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${A.bgOnly}`}></span>
            <div>
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {act.user || "Hệ thống"}
              </span>{" "}
              {act.action}{" "}
              <span className={`font-medium ${A.text}`}>
                {act.targetName || act.target}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-[11px] block mt-0.5">
                {act.date} lúc {act.time}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskActivity;