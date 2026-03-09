CREATE OR REPLACE FUNCTION get_daily_office_report(branch_name text)
RETURNS json AS $$
    const branch = branch_name.toLowerCase();
    
    // 1. THE ROBOT FIX: 
    // If an admin forgot to check on a 'confirmed' person by the end of the day,
    // the robot marks them as a 'No-Show' so the data isn't messy.
    const robotFixedCount = plv8.execute(
        `UPDATE bookings 
         SET status = 'no_show' 
         WHERE LOWER(branch) = $1 
         AND booked_date::date = CURRENT_DATE 
         AND LOWER(status) = 'confirmed'`,
        [branch]
    );

    const bookings = plv8.execute(
        `SELECT status FROM bookings 
         WHERE LOWER(branch) = $1 
         AND booked_date::date = CURRENT_DATE`,
        [branch]
    );

    // 2. THE SIMPLE SCOREBOARD
    const report = {
        branch: branch_name,
        total_customers: bookings.length,
        finished: 0,      // They came in and done!
        cancelled: 0,     // They said they can't come.
        moved_to_later: 0, // Rescheduled.
        no_show: 0,       // Didn't show up.
        forgotten_by_admin: 0, // Still says 'Scheduled' at 11PM!
        robot_fixed_this_many: robotFixedCount
    };

    bookings.forEach(row => {
        const s = (row.status || '').toLowerCase();
        if (s === 'completed') report.finished++;
        else if (s === 'cancelled') report.cancelled++;
        else if (s === 'rescheduled') report.moved_to_later++;
        else if (s === 'no_show') report.no_show++;
        else if (s === 'scheduled') report.forgotten_by_admin++;
    });

    // 3. THE "DID WE WORK?" GRADE
    // We count how many times a human actually touched the booking
    const humanWork = report.finished + report.cancelled + report.moved_to_later;
    
    report.how_much_work_admins_did = report.total_customers > 0 
        ? Math.round((humanWork / report.total_customers) * 100) + '%' 
        : '0%';

    return report;
$$ LANGUAGE plv8;