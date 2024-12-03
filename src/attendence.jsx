import React, { useState, useEffect } from "react";
import axios from "axios";

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch attendance data from the API
    const fetchAttendance = async () => {
      try {
        const response = await axios.get("http://localhost:5000/attendance"); // Update with your actual API URL
        const records = response.data["attendance"];
        // Extract unique users and dates
        const userMap = new Map(); // To store unique users by ID
        const dateSet = new Set();

        records.forEach((record) => {
          userMap.set(record.id, record.username); // Store users by ID
          Object.keys(record).forEach((key) => {
            if (key !== "id" && key !== "username" && key !== "prototype") {
              dateSet.add(key); // Collect unique dates
            }
          });
        });

        setUsers(
          [...userMap.entries()].map(([id, username]) => ({ id, username }))
        );
        setDates([...dateSet].sort()); // Sort dates
        setAttendanceData(records);
        setLoading(false);
      } catch (err) {
        setError("Error fetching attendance data.");
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) {
    return <div>Loading attendance data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">Attendance Records</h2>
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>UserID</th>
            <th>Username</th>
            {dates.map((date) => (
              <th key={date}>{date}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              {dates.map((date) => {
                // Find attendance record for this user and date
                const attendanceRecord = attendanceData.find(
                  (record) => record.id === user.id
                );

                const isPresent = attendanceRecord && attendanceRecord[date];
                return (
                  <td
                    key={date}
                    style={{
                      fontWeight: "bold",
                      color: isPresent ? "green" : "red",
                    }}
                  >
                    {isPresent ? "Present" : "Absent"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Attendance;
