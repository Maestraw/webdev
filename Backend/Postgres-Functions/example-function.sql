CREATE OR REPLACE FUNCTION process_eod_summary(branch_param text)
RETURNS json AS $$
    const branch = branch_param.toLowerCase();
    
    // 1. DATA ACTION: Only flip 'confirmed' to 'no_show'.
    // We leave 'scheduled' alone, but we'll count it in the report.
    const autoFlaggedCount = plv8.execute(
        `UPDATE bookings 
         SET status = 'no_show' 
         WHERE LOWER(branch) = $1 
         AND booked_date::date = CURRENT_DATE 
         AND LOWER(status) = 'confirmed'`,
        [branch]
    );

    // 2. INITIALIZE SUMMARY
    const summary = {
        branch: branch,
        total_booked: 0,
        // Categories for those who "Finished" or "Changed"
        completed: 0,
        cancelled: 0,
        rescheduled: 0,
        no_show: 0, // This will include the ones we just flipped
        // Category for those who "Stayed Still"
        still_scheduled: 0,
        auto_flagged_today: autoFlaggedCount
    };

    // 3. FETCH DATA
    const bookings = plv8.execute(
        `SELECT status FROM bookings 
         WHERE LOWER(branch) = $1 
         AND booked_date::date = CURRENT_DATE`,
        [branch]
    );

    summary.total_booked = bookings.length;

    // 4. SMART AGGREGATION
    bookings.forEach(row => {
        if (!row.status) return;
        const s = row.status.toLowerCase();

        switch(s) {
            case 'completed':   summary.completed++; break;
            case 'cancelled':   summary.cancelled++; break;
            case 'rescheduled': summary.rescheduled++; break;
            case 'no_show':     summary.no_show++; break;
            case 'scheduled':   summary.still_scheduled++; break;
            // Catch-all for any other status you might add later
            default: 
                if(!summary.other) summary.other = 0;
                summary.other++;
        }
    });

    return summary;
$$ LANGUAGE plv8;