import ReviewBookings from "./ReviewBooking.js";
import testCustomers from "./data/test_customers.json" with {type:"json"}

// Review Booking Instance
const rbi=new ReviewBookings()

// Run the test on all customers 
const positives=testCustomers.map((customer)=>{
const bookingStatus=rbi.bookingStatus(customer)
// Log the validated status
console.log("Booking Status",bookingStatus)
})

