import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Calendar, ChevronLeft, ChevronRight, Video, FileCode, Award, Bell } from "lucide-react";

interface CareerEvent {
  id: string;
  appId: string;
  company: string;
  role: string;
  type: "INTERVIEW" | "ASSESSMENT" | "OFFER" | "PENDING";
  title: string;
  dateStr: string;
  dateObj: Date;
  eventType: string;
}

export const CalendarView: React.FC = () => {
  const { applications, setView, setSelectedAppId } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 20)); // June 2026

  // Extract all valid events from applications
  const events: CareerEvent[] = [];

  applications.forEach((app) => {
    if (app.timeline && Array.isArray(app.timeline)) {
      app.timeline.forEach((evt) => {
        if (evt.eventType === "REJECTED" || evt.eventType === "PENDING") return;
        if (evt.extractedDate && evt.extractedDate !== "Not available" && evt.extractedDate.trim() !== "") {
          const parsedDate = new Date(evt.extractedDate);
          if (!isNaN(parsedDate.getTime())) {
            // Map eventType label nicely
            let eventTypeLabel = "Deadline";
            let type: CareerEvent["type"] = "PENDING";
            
            if (evt.eventType === "OFFER") {
              eventTypeLabel = "Joining Date";
              type = "OFFER";
            } else if (evt.eventType === "INTERVIEW") {
              eventTypeLabel = "Interview Date";
              type = "INTERVIEW";
            } else if (evt.eventType === "ASSESSMENT") {
              eventTypeLabel = "Assessment Deadline";
              type = "ASSESSMENT";
            }

            events.push({
              id: `${evt.id}-milestone`,
              appId: app.id,
              company: app.company,
              role: app.role,
              type,
              title: `${app.company} ${eventTypeLabel}`,
              dateStr: evt.extractedDate,
              dateObj: parsedDate,
              eventType: eventTypeLabel
            });
          }
        }
      });
    }
  });

  // Sort events chronologically
  events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  const getEventsForDay = (day: number) => {
    return events.filter((e) => {
      return (
        e.dateObj.getDate() === day &&
        e.dateObj.getMonth() === month &&
        e.dateObj.getFullYear() === year
      );
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleEventClick = (appId: string) => {
    setSelectedAppId(appId);
    setView("tracker");
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start page-entrance">
      {/* Left: Monthly calendar grid */}
      <section className="lg:col-span-7 space-y-6">
        <div className="glass-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Career Calendar</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone tracker</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 transition active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider min-w-[100px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-550 transition active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-14 bg-slate-50/20 rounded-xl"></div>;
              }

              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              
              // Get dominant event type style
              let bgClass = "bg-white/40 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/80 border-slate-100 dark:border-slate-800";
              let textClass = "text-slate-700 dark:text-slate-300";
              if (hasEvents) {
                const types = dayEvents.map((e) => e.type);
                if (types.includes("OFFER")) {
                  bgClass = "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-250 dark:border-emerald-900/60";
                  textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                } else if (types.includes("INTERVIEW")) {
                  bgClass = "bg-blue-500/10 hover:bg-blue-500/15 border-blue-250 dark:border-blue-900/60";
                  textClass = "text-blue-700 dark:text-blue-400 font-bold";
                } else if (types.includes("ASSESSMENT")) {
                  bgClass = "bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-250 dark:border-yellow-900/60";
                  textClass = "text-yellow-750 dark:text-yellow-405 font-bold";
                } else {
                  bgClass = "bg-purple-500/10 hover:bg-purple-500/15 border-purple-250 dark:border-purple-900/60";
                  textClass = "text-purple-700 dark:text-purple-400 font-bold";
                }
              }

              return (
                <div
                  key={`day-${day}`}
                  className={`h-14 border p-1 rounded-xl transition flex flex-col justify-between items-start relative cursor-pointer ${bgClass}`}
                  onClick={() => {
                    if (dayEvents.length > 0) {
                      handleEventClick(dayEvents[0].appId);
                    }
                  }}
                >
                  <span className={`text-[10px] ${textClass}`}>{day}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 w-full overflow-hidden">
                      {dayEvents.slice(0, 3).map((e, eIdx) => {
                        let dotColor = "bg-purple-500";
                        if (e.type === "OFFER") dotColor = "bg-emerald-500";
                        else if (e.type === "INTERVIEW") dotColor = "bg-blue-500";
                        else if (e.type === "ASSESSMENT") dotColor = "bg-amber-400";
                        return (
                          <span
                            key={eIdx}
                            className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                            title={e.title}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right: Chronological milestones list */}
      <section className="lg:col-span-5 space-y-4">
        <div className="glass-card p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Upcoming Timeline</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Next career milestones</p>
          </div>

          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {events.length > 0 ? (
              events.map((event) => {
                let badgeClass = "bg-purple-50 text-purple-755 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900";
                let Icon = Bell;
                
                if (event.type === "OFFER") {
                  badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900";
                  Icon = Award;
                } else if (event.type === "INTERVIEW") {
                  badgeClass = "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900";
                  Icon = Video;
                } else if (event.type === "ASSESSMENT") {
                  badgeClass = "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900";
                  Icon = FileCode;
                }

                return (
                  <div 
                    key={event.id}
                    onClick={() => handleEventClick(event.appId)}
                    className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-800/80 hover:border-purple-250 hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all duration-200 space-y-4 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8.5 h-8.5 rounded-lg border flex items-center justify-center shrink-0 shadow-sm ${badgeClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-405 font-bold uppercase tracking-widest leading-none block mb-1">Company</span>
                        <div className="flex items-baseline gap-2">
                          <h4 className="font-extrabold text-xs text-slate-905 dark:text-white leading-none truncate">
                            {event.company}
                          </h4>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider block mt-0.5">{event.eventType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-slate-800/80 pt-3.5">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Role</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{event.role}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-widest block mb-0.5">📅 Date</span>
                        <span className="text-xs text-slate-700 dark:text-slate-205 font-extrabold">{event.dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-card rounded-2xl p-8 text-center space-y-4 shadow-sm flex flex-col items-center justify-center border-dashed border-2 border-purple-200/40">
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-200/20 rounded-xl flex items-center justify-center text-purple-600 shadow-inner">
                  <Calendar className="w-5 h-5 text-purple-650" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    No Actionable Milestones
                  </h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-[200px] mx-auto leading-relaxed font-semibold">
                    Schedule details, test tasks, and interview loops will sync dynamically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
