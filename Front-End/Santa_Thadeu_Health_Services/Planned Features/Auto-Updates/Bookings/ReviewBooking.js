import bookings from "./data/bookings.json" with { type: "json" };

export default class ReviewBookings {
  constructor() {
    this.bookings = bookings;
    // Weights for our multi-field strategy
    this.weights = {
      phone: 0.5,     // Heaviest weight
      name: 0.3,      // Middle weight
      branch: 0.1,    // Context
      service: 0.1    // Context
    };
  }

  // ENTRY POINT
  bookingStatus = (options) => {
  const result = this.calculateBestMatch(options);
  const response={success:false,data:[],message:[]}
  // LOGGING SECTION
  if (result.booking) {
    console.log(`\n🔍 MATCH ANALYSIS FOR: "${options.customer_name}"`);
    console.table([{
      Score: result.score.toFixed(2),
      Status: this.getLabel(result.score),
      Input_Name: options.customer_name,
      Match_Name: result.booking.customer_name,
      Input_Phone: options.phonenumber,
      Match_Phone: result.booking.phonenumber,
      Branch_Match: options.branch === result.booking.branch ? "✅" : "❌",
      ID: result.booking.id
    }]);
  } else {
    console.warn(`\n❌ NO MATCH FOUND FOR: "${options.customer_name}"`);
  }

  // LOGIC SECTION
  if (!result || result.score < 0.2) return {...response,message:["unmatched"],data:[result]};
  if (result.score >= 0.8) return {...response,succes:true,message:["confirmed-match"],data:[result]} ;
  if (result.score >= 0.5) return {...response,succes:true,message:["possible-match"],data:[result]} ;;

  return "manual-verification";
};

// Helper for the table label
getLabel = (score) => {
  if (score >= 0.8) return "✅ CONFIRMED";
  if (score >= 0.5) return "🟡 POSSIBLE";
  return "🚩 MANUAL";
};

  // Helper: Normalize phone numbers (Critical for your dataset)
  normalizePhone(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/\D/g, ""); 
    if (cleaned.startsWith("263")) cleaned = "0" + cleaned.substring(3);
    return cleaned;
  }

  // COMPARE FIELD LOGIC
  calculateBestMatch = (input) => {
  let bestMatch = null;
  let bestScore = 0;

  for (const b of this.bookings) {
    // --- 1. THE NAME (70% Weight) ---
    const nameMatch = this.compareName(input?.customer_name || "", b?.customer_name || "");
    const namePortion = nameMatch * 0.7;

    // --- 2. THE SUPPORTERS (30% Weight Combined) ---
    const inputPhone = this.normalizePhone(input?.phonenumber || "");
    const dbPhone = this.normalizePhone(b?.phonenumber || "");
    
    // Assign sub-weights within the 30% bucket
    let supportScore = 0;
    
    // Phone is the strongest supporter (e.g., 20% of total / 0.2)
    if (inputPhone && dbPhone && inputPhone === dbPhone) {
      supportScore += 0.20;
    }
    
    // Branch (5% of total / 0.05)
    if (input.branch?.toLowerCase() === b.branch?.toLowerCase()) {
      supportScore += 0.05;
    }
    
    // Service (5% of total / 0.05)
    if (input.visittype?.toLowerCase() === b.service?.toLowerCase()) {
      supportScore += 0.05;
    }

    // --- 3. FINAL AGGREGATION ---
    // If the name is a total mismatch (0), we don't let the supporters carry it.
    // This is the "Gatekeeper" rule.
    let finalScore = namePortion + supportScore;
    
    if (nameMatch === 0) {
      finalScore = supportScore * 0.5; // Shared phone numbers won't cross 0.15 score
    }

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = b;
    }
  }

  return { 
    booking: bestMatch, 
    score: bestScore 
  };
};

  // Your existing logic improved with minor fuzzy check
compareName(name1, name2) {
  if (!name1 || !name2) return 0;
  
  // Clean names: Remove special chars, extra spaces, and titles
  const clean = (s) => s.toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|sr)\.?\b/g, '') // Remove titles
    .replace(/[^a-z0-9\s]/g, '')             // Remove punctuation
    .trim();

  const n1 = clean(name1);
  const n2 = clean(name2);

  if (n1 === n2) return 1.0;

  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);

  // Intersection Check
  const intersection = words1.filter(w => words2.includes(w));
  
  // If at least one name matches (e.g., "Moyo"), give a base score
  if (intersection.length > 0) {
    return intersection.length / Math.max(words1.length, words2.length);
  }

  // Last Resort: Character-based Fuzzy Match (Handle small typos)
  const distance = this.levenshtein(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  const fuzzyScore = (maxLength - distance) / maxLength;

  return fuzzyScore > 0.7 ? fuzzyScore : 0; // Only return if it's reasonably close
}

// Standard Levenshtein Algorithm for typos
levenshtein(a, b) {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}
}