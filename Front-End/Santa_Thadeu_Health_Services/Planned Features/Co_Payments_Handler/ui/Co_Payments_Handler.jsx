import React, { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import { Check, Edit, Save } from 'lucide-react';

// --- Data Definitions ---

const ACCOUNT_OPTIONS = [
  { label: "Sentosa Cash Box", value: "Sentosa Cash Box", currencies: ["USD", "ZWG"] },
  { label: "Queensdale Cash Box", value: "Queensdale Cash Box", currencies: ["USD", "ZWG"] },
  { label: "Outreach Cash Box", value: "Outreach Cash Box", currencies: ["USD", "ZWG"] },
  { label: "General Office Cash Box", value: "General Office Cash Box", currencies: ["USD", "ZWG"] },
  { label: "NMB USD", value: "NMB USD", currencies: ["USD"] },
  { label: "NMB Visa", value: "NMB Visa", currencies: ["USD"] },
  { label: "NMB ZWG", value: "NMB ZWG", currencies: ["ZWG"] },
  { label: "NMB Vault", value: "NMB Vault", currencies: ["USD", "ZWG"] },
  { label: "BancABC USD", value: "BancABC USD", currencies: ["USD"] },
  { label: "BancABC ZWG", value: "BancABC ZWG", currencies: ["ZWG"] },
  { label: "BancABC Vault", value: "BancABC Vault", currencies: ["USD", "ZWG"] },
  { label: "Sentosa Ecocash ZWG", value: "Sentosa Ecocash ZWG", currencies: ["ZWG"] },
  { label: "Sentosa Ecocash USD", value: "Sentosa Ecocash USD", currencies: ["USD"] },
  { label: "Queensdale Ecocash ZWG", value: "Queensdale Ecocash ZWG", currencies: ["ZWG"] },
  { label: "Queensdale Ecocash USD", value: "Queensdale Ecocash USD", currencies: ["USD"] },
  { label: "Outreach Ecocash ZWG", value: "Outreach Ecocash ZWG", currencies: ["ZWG"] },
  { label: "Outreach Ecocash USD", value: "Outreach Ecocash USD", currencies: ["USD"] },
];

const CURRENCY_OPTIONS = ["USD", "ZWG"];
const DISCIPLINE_OPTIONS = ["Medical", "Dental", "Psychology"];

const STEPS = ['Payment Details', 'Select Discipline', 'Confirmation & Save'];

// --- Helper Components ---

/**
 * Step 1: Payment Details Form
 * Handles Currency, Amount, and Account Used (filtered by currency).
 */
const Step1PaymentDetails = ({ formData, handleChange, errors, filteredAccounts }) => {
  return (
    <Box className="space-y-6 p-4">
      {/* 1. Currency Select */}
      <FormControl fullWidth required error={!!errors.currency}>
        <InputLabel id="currency-label">Currency</InputLabel>
        <Select
          labelId="currency-label"
          id="currency"
          name="currency"
          value={formData.currency}
          label="Currency"
          onChange={handleChange}
        >
          {CURRENCY_OPTIONS.map(c => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </Select>
        {errors.currency && <Typography color="error" variant="caption">{errors.currency}</Typography>}
      </FormControl>

      {/* 2. Amount Text Field */}
      <TextField
        fullWidth
        required
        label="Amount"
        name="amount"
        type="number"
        value={formData.amount || ''}
        onChange={handleChange}
        error={!!errors.amount}
        helperText={errors.amount}
      />

      {/* 3. Account Used Select (Filters based on Currency) */}
      <FormControl fullWidth required error={!!errors.accountUsed}>
        <InputLabel id="account-label">Account Used</InputLabel>
        <Select
          labelId="account-label"
          id="accountUsed"
          name="accountUsed"
          value={formData.accountUsed}
          label="Account Used"
          onChange={handleChange}
          disabled={!formData.currency}
        >
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map(account => (
              <MenuItem key={account.value} value={account.value}>
                {account.label}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              Select a Currency first
            </MenuItem>
          )}
        </Select>
        {errors.accountUsed && <Typography color="error" variant="caption">{errors.accountUsed}</Typography>}
      </FormControl>
    </Box>
  );
};

/**
 * Step 2: Select Discipline Form
 */
const Step2Discipline = ({ formData, handleChange, errors }) => (
  <Box className="space-y-6 p-4">
    <FormControl required error={!!errors.discipline}>
      <FormLabel id="discipline-radio-buttons-group-label">Select Discipline</FormLabel>
      <RadioGroup
        aria-labelledby="discipline-radio-buttons-group-label"
        name="discipline"
        value={formData.discipline}
        onChange={handleChange}
      >
        {DISCIPLINE_OPTIONS.map(d => (
          <FormControlLabel key={d} value={d} control={<Radio />} label={d} />
        ))}
      </RadioGroup>
      {errors.discipline && <Typography color="error" variant="caption" className="pl-4">{errors.discipline}</Typography>}
    </FormControl>
  </Box>
);

/**
 * Step 3: Confirmation and Editable Summary
 * NOTE: Currency, Account Used, and Discipline are now Select fields for easier editing.
 */
const Step3Confirmation = ({ formData, handleChange, filteredAccounts }) => {
  return (
    <Box className="p-4 space-y-6">
      <Typography variant="h6" className="text-center font-semibold">
        Review & Finalize Co-Payment
      </Typography>
      <Paper elevation={1} className="p-6 space-y-6 rounded-xl">

        {/* 1. Currency Select (Editable) */}
        <FormControl fullWidth variant="outlined">
          <InputLabel id="confirm-currency-label">Currency</InputLabel>
          <Select
            labelId="confirm-currency-label"
            id="confirm-currency"
            name="currency"
            value={formData.currency}
            label="Currency"
            onChange={handleChange}
          >
            {CURRENCY_OPTIONS.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 2. Amount Text Field (Editable) */}
        <TextField
          fullWidth
          label="Amount"
          name="amount"
          type="number"
          value={formData.amount || ''}
          onChange={handleChange}
          // Added visual clue for editability
          InputProps={{ endAdornment: <Edit size={16} className="text-gray-400" /> }}
        />

        {/* 3. Account Used Select (Editable & Filtered) */}
        <FormControl fullWidth variant="outlined">
          <InputLabel id="confirm-account-label">Account Used</InputLabel>
          <Select
            labelId="confirm-account-label"
            id="confirm-accountUsed"
            name="accountUsed"
            value={formData.accountUsed}
            label="Account Used"
            onChange={handleChange}
            disabled={!formData.currency}
          >
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map(account => (
                <MenuItem key={account.value} value={account.value}>
                  {account.label}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                Select a Currency first
              </MenuItem>
            )}
          </Select>
        </FormControl>
        
        {/* 4. Discipline Select (Editable) */}
        <FormControl fullWidth variant="outlined">
          <InputLabel id="confirm-discipline-label">Discipline</InputLabel>
          <Select
            labelId="confirm-discipline-label"
            id="confirm-discipline"
            name="discipline"
            value={formData.discipline}
            label="Discipline"
            onChange={handleChange}
          >
            {DISCIPLINE_OPTIONS.map(d => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
      </Paper>
    </Box>
  );
};

// --- Main Stepper Logic Component ---

const CO_PAYMENTS_HANDLER = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    currency: '',
    amount: '',
    accountUsed: '',
    discipline: '',
  });
  const [errors, setErrors] = useState({});

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setActiveStep(0); // Reset step on close
    setFormData({ currency: '', amount: '', accountUsed: '', discipline: '' }); // Reset form
    setErrors({});
  };

  // Calculate filtered accounts based on current currency (used by Step 1 and Step 3)
  const filteredAccounts = useMemo(() => {
    return ACCOUNT_OPTIONS.filter(account =>
      account.currencies.includes(formData.currency)
    );
  }, [formData.currency]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for Currency change: reset Account Used if it becomes invalid
    if (name === 'currency') {
      const selectedCurrency = value;
      const currentAccount = ACCOUNT_OPTIONS.find(a => a.value === formData.accountUsed);

      if (currentAccount && !currentAccount.currencies.includes(selectedCurrency)) {
        setFormData(prev => ({ ...prev, [name]: value, accountUsed: '' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear error for the field being edited
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep = (step) => {
    let newErrors = {};
    let isValid = true;

    if (step === 0) {
      if (!formData.currency) { newErrors.currency = 'Currency is required.'; isValid = false; }
      if (!formData.amount || formData.amount <= 0) { newErrors.amount = 'Amount must be a positive number.'; isValid = false; }
      // Check if the selected account is still valid for the current currency (just in case)
      const currentAccountValid = ACCOUNT_OPTIONS.find(a => a.value === formData.accountUsed)?.currencies.includes(formData.currency);
      if (!formData.accountUsed || !currentAccountValid) { newErrors.accountUsed = 'Account used is required.'; isValid = false; }
    } else if (step === 1) {
      if (!formData.discipline) { newErrors.discipline = 'Discipline is required.'; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = () => {
    console.log('Final Co-Payment Data Saved:', formData);
    // In a real application, you would send this data to an API
    handleClose();
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <Step1PaymentDetails formData={formData} handleChange={handleChange} errors={errors} filteredAccounts={filteredAccounts} />;
      case 1:
        return <Step2Discipline formData={formData} handleChange={handleChange} errors={errors} />;
      case 2:
        return <Step3Confirmation formData={formData} handleChange={handleChange} filteredAccounts={filteredAccounts} />;
      default:
        return 'Unknown step';
    }
  };

  return (
    <div className="p-8 min-h-screen flex items-center justify-center bg-gray-50">
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen}
        className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
      >
        Apply Co-Payment
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        // Ensure dialog content is centered and responsive
        PaperProps={{ className: "rounded-xl shadow-2xl p-2 md:p-4" }}
      >
        <DialogTitle className="text-center text-xl font-bold bg-indigo-50 text-indigo-800 rounded-t-lg">
          <Box className="flex justify-between items-center">
            Apply Patient Co-Payment
            <Button onClick={handleClose} color="error" size="small" variant="text" className="text-sm">
              Close
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent className="py-6">
          <Stepper activeStep={activeStep} alternativeLabel className="mb-8">
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Paper elevation={3} className="min-h-[250px] rounded-lg p-4">
            {getStepContent(activeStep)}
          </Paper>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
              variant="outlined"
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />

            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSave}
                color="success"
                startIcon={<Save />}
                className="shadow-md"
              >
                Save Co-Payment
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                startIcon={<Check />}
                className="shadow-md"
              >
                Next
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Default export is mandatory for the Canvas environment
export default App;

function App() {
  // We wrap the component here just to satisfy the single-file React component structure.
  // In a real project, CO_PAYMENTS_HANDLER would be imported into App.
  return <CO_PAYMENTS_HANDLER />;
}
