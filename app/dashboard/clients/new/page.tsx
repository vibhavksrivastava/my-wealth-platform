"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Wallet, 
  Building2, 
  TrendingUp, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  PieChart, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  Loader2
} from "lucide-react";
import type { 
  CompleteFactFindPayload,
  ClientPersonalDetails, 
  IncomeItemInput, 
  ExpenseItemInput, 
  AssetItemInput, 
  LiabilityItemInput, 
  InvestmentItemInput,
  HouseholdOption 
} from "@/types/factfind";

function formatINR(val: number) {
  if (isNaN(val)) return "₹0";
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  } else {
    return `₹${val.toLocaleString("en-IN")}`;
  }
}

const INCOME_CATEGORIES = [
  "Salary",
  "Business & Professional",
  "Rental Income",
  "Dividend Income",
  "Interest on Fixed Deposits",
  "Consulting Fees",
  "Pension / Annuity",
  "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Housing & Rent",
  "Groceries & Food",
  "Utilities & Electricity",
  "Children Education & School Fees",
  "Healthcare & Medical",
  "Lifestyle & Entertainment",
  "Travel & Commute",
  "Personal Care & Shopping",
  "Other Living Expenses",
];

const ASSET_CATEGORIES = [
  "Real Estate (Primary Residence)",
  "Real Estate (Investment Property)",
  "Gold & Precious Metals",
  "Bank Fixed Deposits (FDs)",
  "PPF / EPF / NPS",
  "Savings Account Balance",
  "Liquid Mutual Funds",
  "Vehicles",
  "Other Physical Assets",
];

const LIABILITY_CATEGORIES = [
  "Home Loan",
  "Car / Vehicle Loan",
  "Personal Loan",
  "Education Loan",
  "Credit Card Outstanding",
  "Loan Against Property (LAP)",
  "Business Loan",
  "Other Liabilities",
];

const ASSET_CLASSES = [
  "Equity Mutual Funds (Large Cap)",
  "Equity Mutual Funds (Mid / Small Cap)",
  "Flexi Cap / Multi Cap MF",
  "Debt Mutual Funds",
  "Hybrid / Balanced Advantage MF",
  "Direct Stocks / Equities",
  "Sovereign Gold Bonds (SGB)",
  "Corporate Fixed Deposits",
  "Alternative Investments (AIF)",
];

export default function NewClientFactFindPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client User Account Integration State
  const [unlinkedUsers, setUnlinkedUsers] = useState<any[]>([]);
  const [userAccountMode, setUserAccountMode] = useState<"existing_user" | "new_user" | "offline">("existing_user");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createdUserSuccess, setCreatedUserSuccess] = useState<string | null>(null);

  // Step 1: Personal Details
  const [personal, setPersonal] = useState<ClientPersonalDetails>({
    full_name: "",
    date_of_birth: "",
    marital_status: "Married",
    dependents_count: 0,
    pan_number: "",
    occupation: "Service",
    employer_business_name: "",
    annual_gross_income: 0,
    tax_regime: "New",
    risk_profile: "Moderate",
    planning_horizon_years: 6,
    review_frequency: "Annual",
    advisor_name: "",
    spouse_name: "",
    spouse_dob: "",
    household_mode: "existing",
    household_id: "",
    new_household_name: "",
    planning_disclosures_notes: "",
  });

  // Step 2: Cash Flow (Income & Expenses)
  const [incomeList, setIncomeList] = useState<IncomeItemInput[]>([
    { category: "Salary", monthly_amount: 0, notes: "" },
  ]);

  const [expenseList, setExpenseList] = useState<ExpenseItemInput[]>([
    { category: "Groceries & Food", monthly_amount: 0, is_essential: true, notes: "" },
    { category: "Housing & Rent", monthly_amount: 0, is_essential: true, notes: "" },
  ]);

  // Step 3: Balance Sheet (Assets & Liabilities)
  const [assetList, setAssetList] = useState<AssetItemInput[]>([
    { asset_category: "Real Estate (Primary Residence)", description: "Primary Family Residence", current_market_value: 0, is_liquid: false, notes: "" },
  ]);

  const [liabilityList, setLiabilityList] = useState<LiabilityItemInput[]>([
    { liability_type: "Home Loan", lender_name: "", outstanding_principal: 0, annual_interest_rate: 8.5, monthly_emi: 0, tenure_remaining_months: 180, notes: "" },
  ]);

  // Step 4: Investment Portfolio
  const [investmentList, setInvestmentList] = useState<InvestmentItemInput[]>([
    { asset_class: "Equity Mutual Funds (Large Cap)", scheme_instrument_name: "", invested_amount: 0, current_value: 0, monthly_sip_amount: 0, expected_return_cagr: 12.0, goal_purpose: "Retirement Corpus" },
  ]);

  // Load Households & Registered Client Users on Mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Load tenant-isolated households
    fetch("/api/households", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.households) {
          setHouseholds(data.households);
          if (data.households.length > 0) {
            setPersonal((prev) => ({ ...prev, household_id: data.households[0].household_id }));
          }
        }
      })
      .catch(console.error);

    // Load registered client users in this firm
    fetch("/api/advisor/client-users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.unlinkedUsers) {
          setUnlinkedUsers(data.unlinkedUsers);
          if (data.unlinkedUsers.length === 0) {
            setUserAccountMode("offline");
          }
        }
      })
      .catch(console.error);
  }, [router]);

  // Handler to create a new client login user on the fly
  const handleCreateClientUser = async () => {
    if (!newUserForm.email || !newUserForm.email.trim()) {
      setErrorMessage("Please enter the client's email address.");
      return;
    }

    setIsCreatingUser(true);
    setErrorMessage(null);
    setCreatedUserSuccess(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/advisor/client-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUserForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create user account.");

      setSelectedUserId(json.user.id);
      const nameParts = [json.user.first_name, json.user.last_name].filter(Boolean).join(" ");
      setPersonal((prev) => ({
        ...prev,
        full_name: nameParts || prev.full_name,
        user_id: json.user.id,
        user_email: json.user.email,
      }));

      setCreatedUserSuccess(
        `✓ Created client account "${json.user.email}". Temporary password: "${json.user.temporaryPassword}"`
      );
      setUnlinkedUsers((prev) => [json.user, ...prev]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create client user account.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Step 2 Calculations
  const totalMonthlyIncome = incomeList.reduce((acc, curr) => acc + Number(curr.monthly_amount || 0), 0);
  const totalMonthlyLivingExpenses = expenseList.reduce((acc, curr) => acc + Number(curr.monthly_amount || 0), 0);
  const totalMonthlyEMIs = liabilityList.reduce((acc, curr) => acc + Number(curr.monthly_emi || 0), 0);
  const totalMonthlyOutflow = totalMonthlyLivingExpenses + totalMonthlyEMIs;
  const netMonthlyCashSurplus = totalMonthlyIncome - totalMonthlyOutflow;

  // Step 3 Calculations
  const totalPhysicalAssets = assetList.reduce((acc, curr) => acc + Number(curr.current_market_value || 0), 0);
  const totalLiabilities = liabilityList.reduce((acc, curr) => acc + Number(curr.outstanding_principal || 0), 0);

  // Step 4 Calculations
  const totalInvestments = investmentList.reduce((acc, curr) => acc + Number(curr.current_value || 0), 0);
  const totalInvestedPrincipal = investmentList.reduce((acc, curr) => acc + Number(curr.invested_amount || 0), 0);
  const totalSIPVolume = investmentList.reduce((acc, curr) => acc + Number(curr.monthly_sip_amount || 0), 0);

  // Overall Net Worth
  const grandTotalAssets = totalPhysicalAssets + totalInvestments;
  const grandNetWorth = grandTotalAssets - totalLiabilities;

  // Row Handlers: Income
  const addIncomeRow = () => {
    setIncomeList([...incomeList, { category: "Salary", monthly_amount: 0, notes: "" }]);
  };
  const removeIncomeRow = (index: number) => {
    setIncomeList(incomeList.filter((_, i) => i !== index));
  };
  const updateIncomeRow = (index: number, field: keyof IncomeItemInput, value: any) => {
    const updated = [...incomeList];
    updated[index] = { ...updated[index], [field]: value };
    setIncomeList(updated);
  };

  // Row Handlers: Expenses
  const addExpenseRow = () => {
    setExpenseList([...expenseList, { category: "Other Living Expenses", monthly_amount: 0, is_essential: true, notes: "" }]);
  };
  const removeExpenseRow = (index: number) => {
    setExpenseList(expenseList.filter((_, i) => i !== index));
  };
  const updateExpenseRow = (index: number, field: keyof ExpenseItemInput, value: any) => {
    const updated = [...expenseList];
    updated[index] = { ...updated[index], [field]: value };
    setExpenseList(updated);
  };

  // Row Handlers: Assets
  const addAssetRow = () => {
    setAssetList([...assetList, { asset_category: "Bank Fixed Deposits (FDs)", description: "", current_market_value: 0, is_liquid: true, notes: "" }]);
  };
  const removeAssetRow = (index: number) => {
    setAssetList(assetList.filter((_, i) => i !== index));
  };
  const updateAssetRow = (index: number, field: keyof AssetItemInput, value: any) => {
    const updated = [...assetList];
    updated[index] = { ...updated[index], [field]: value };
    setAssetList(updated);
  };

  // Row Handlers: Liabilities
  const addLiabilityRow = () => {
    setLiabilityList([...liabilityList, { liability_type: "Car / Vehicle Loan", lender_name: "", outstanding_principal: 0, annual_interest_rate: 8.5, monthly_emi: 0, tenure_remaining_months: 60, notes: "" }]);
  };
  const removeLiabilityRow = (index: number) => {
    setLiabilityList(liabilityList.filter((_, i) => i !== index));
  };
  const updateLiabilityRow = (index: number, field: keyof LiabilityItemInput, value: any) => {
    const updated = [...liabilityList];
    updated[index] = { ...updated[index], [field]: value };
    setLiabilityList(updated);
  };

  // Row Handlers: Investments
  const addInvestmentRow = () => {
    setInvestmentList([...investmentList, { asset_class: "Equity Mutual Funds (Large Cap)", scheme_instrument_name: "", invested_amount: 0, current_value: 0, monthly_sip_amount: 0, expected_return_cagr: 12.0, goal_purpose: "" }]);
  };
  const removeInvestmentRow = (index: number) => {
    setInvestmentList(investmentList.filter((_, i) => i !== index));
  };
  const updateInvestmentRow = (index: number, field: keyof InvestmentItemInput, value: any) => {
    const updated = [...investmentList];
    updated[index] = { ...updated[index], [field]: value };
    setInvestmentList(updated);
  };

  // Step Validation
  const validateCurrentStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!personal.full_name.trim()) {
        setErrorMessage("Please enter the client's full legal name.");
        return false;
      }
      if (!personal.date_of_birth) {
        setErrorMessage("Please select the date of birth.");
        return false;
      }
      if (personal.household_mode === "new" && !personal.new_household_name?.trim()) {
        setErrorMessage("Please specify the new household name.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Form Submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const payload: CompleteFactFindPayload = {
      personal: {
        ...personal,
        user_id: selectedUserId || personal.user_id || undefined,
      },
      income: incomeList,
      expenses: expenseList,
      assets: assetList,
      liabilities: liabilityList,
      investments: investmentList,
    };

    try {
      const res = await fetch("/api/clients/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit client financial fact-find.");
      }

      // Success redirect to the newly created client's Net Worth view!
      router.push(`/dashboard/clients/${json.clientId}/net-worth`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    { num: 1, label: "Client & Household", icon: User },
    { num: 2, label: "Cash Flow", icon: Wallet },
    { num: 3, label: "Assets & Debt", icon: Building2 },
    { num: 4, label: "Investments", icon: TrendingUp },
    { num: 5, label: "Review & Submit", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/advisor" className="hover:text-white transition">
              Advisor Console
            </Link>
            <span>/</span>
            <span className="text-sky-400 font-medium">New Client Fact-Find</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-sky-400" />
            Client Fact-Find & Portfolio Intake
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record comprehensive household demographics, income streams, living expenses, balance sheet assets, and portfolios.
          </p>
        </div>

        {/* Live Net Worth Badge */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Computed Net Worth</div>
            <div className={`text-base font-bold ${grandNetWorth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatINR(grandNetWorth)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Monthly Cash Flow</div>
            <div className={`text-base font-bold ${netMonthlyCashSurplus >= 0 ? "text-sky-400" : "text-amber-400"}`}>
              {formatINR(netMonthlyCashSurplus)}/mo
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Header Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        {stepLabels.map((s) => {
          const StepIcon = s.icon;
          const isActive = currentStep === s.num;
          const isCompleted = currentStep > s.num;

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < currentStep || validateCurrentStep()) {
                  setCurrentStep(s.num);
                }
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition text-left ${
                isActive
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : isCompleted
                  ? "bg-slate-800/80 text-emerald-400 hover:bg-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                  isActive
                    ? "bg-white text-sky-600"
                    : isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Personal & Demographic Info */}
      {currentStep === 1 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-sky-400" />
              Client Profile &amp; Household Assignment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter primary investor information and select or create the family household.
            </p>
          </div>

          {/* Client User Account Integration & Linkage */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Client User Account &amp; Portal Access
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Link to login credentials or create a new user account
              </span>
            </div>

            {/* Mode Radios */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="userAccountMode"
                  checked={userAccountMode === "existing_user"}
                  onChange={() => setUserAccountMode("existing_user")}
                  className="accent-sky-500"
                />
                <span>Link Registered User ({unlinkedUsers.length} available)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="userAccountMode"
                  checked={userAccountMode === "new_user"}
                  onChange={() => setUserAccountMode("new_user")}
                  className="accent-sky-500"
                />
                <span>+ Create New User Account</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="userAccountMode"
                  checked={userAccountMode === "offline"}
                  onChange={() => {
                    setUserAccountMode("offline");
                    setSelectedUserId("");
                  }}
                  className="accent-sky-500"
                />
                <span>Offline Profile (No App Login)</span>
              </label>
            </div>

            {/* Existing User Selector */}
            {userAccountMode === "existing_user" && (
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Select Registered Client User in Firm (Created by Firm Admin)
                </label>
                {unlinkedUsers.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-dashed border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>No unlinked client users registered in this practice yet.</span>
                    <button
                      type="button"
                      onClick={() => setUserAccountMode("new_user")}
                      className="text-sky-400 font-bold hover:underline"
                    >
                      + Create User Now
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedUserId(uid);
                      const u = unlinkedUsers.find((x) => x.id === uid);
                      if (u) {
                        const nameParts = [u.first_name, u.last_name].filter(Boolean).join(" ");
                        setPersonal((prev) => ({
                          ...prev,
                          full_name: nameParts || prev.full_name,
                          user_id: u.id,
                          user_email: u.email,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Choose registered client user --</option>
                    {unlinkedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Create New User Inline Form */}
            {userAccountMode === "new_user" && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="client@gmail.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">First Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Password</label>
                    <input
                      type="text"
                      placeholder="Default: auto-generated"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Creates an active &ldquo;CLIENT&rdquo; account under this firm.
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateClientUser}
                    disabled={isCreatingUser || !newUserForm.email}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {isCreatingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Create &amp; Link User</span>
                  </button>
                </div>

                {createdUserSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{createdUserSuccess}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={personal.full_name}
                onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={personal.date_of_birth}
                onChange={(e) => setPersonal({ ...personal, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                PAN Number
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={personal.pan_number}
                onChange={(e) => setPersonal({ ...personal, pan_number: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono uppercase focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Marital Status
              </label>
              <select
                value={personal.marital_status}
                onChange={(e) => setPersonal({ ...personal, marital_status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Occupation
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Architect"
                value={personal.occupation}
                onChange={(e) => setPersonal({ ...personal, occupation: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Employer / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. Microsoft India"
                value={personal.employer_business_name}
                onChange={(e) => setPersonal({ ...personal, employer_business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Gross Annual Income (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 3500000"
                value={personal.annual_gross_income || ""}
                onChange={(e) => setPersonal({ ...personal, annual_gross_income: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Tax Regime
              </label>
              <select
                value={personal.tax_regime}
                onChange={(e) => setPersonal({ ...personal, tax_regime: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="New">New Tax Regime</option>
                <option value="Old">Old Tax Regime</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Assessed Risk Profile
              </label>
              <select
                value={personal.risk_profile}
                onChange={(e) => setPersonal({ ...personal, risk_profile: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Conservative">Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Planning Horizon (Years)
              </label>
              <input
                type="number"
                value={personal.planning_horizon_years}
                onChange={(e) => setPersonal({ ...personal, planning_horizon_years: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Number of Dependents
              </label>
              <input
                type="number"
                value={personal.dependents_count}
                onChange={(e) => setPersonal({ ...personal, dependents_count: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Review Frequency
              </label>
              <select
                value={personal.review_frequency}
                onChange={(e) => setPersonal({ ...personal, review_frequency: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Quarterly">Quarterly</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          </div>

          {/* Spouse Details (if Married) */}
          {personal.marital_status === "Married" && (
            <div className="pt-4 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Spouse Details (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Spouse Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={personal.spouse_name}
                    onChange={(e) => setPersonal({ ...personal, spouse_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Spouse Date of Birth</label>
                  <input
                    type="date"
                    value={personal.spouse_dob}
                    onChange={(e) => setPersonal({ ...personal, spouse_dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Household Assignment */}
          <div className="pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Household Group Assignment
            </h3>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="household_mode"
                  checked={personal.household_mode === "existing"}
                  onChange={() => setPersonal({ ...personal, household_mode: "existing" })}
                  className="text-sky-500 focus:ring-sky-500"
                />
                Assign to Existing Household
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="household_mode"
                  checked={personal.household_mode === "new"}
                  onChange={() => setPersonal({ ...personal, household_mode: "new" })}
                  className="text-sky-500 focus:ring-sky-500"
                />
                Create New Household Group
              </label>
            </div>

            {personal.household_mode === "existing" ? (
              <div>
                <select
                  value={personal.household_id}
                  onChange={(e) => setPersonal({ ...personal, household_id: e.target.value })}
                  className="w-full max-w-md px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {households.map((h) => (
                    <option key={h.household_id} value={h.household_id}>
                      {h.household_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="e.g. Sharma Family Household"
                  value={personal.new_household_name}
                  onChange={(e) => setPersonal({ ...personal, new_household_name: e.target.value })}
                  className="w-full max-w-md px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Cash Flow (Inflows & Living Expenses) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Real-Time Net Cash Flow KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Monthly Inflows</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatINR(totalMonthlyIncome)}/mo</div>
              <span className="text-[11px] text-slate-500">Annual: {formatINR(totalMonthlyIncome * 12)}/yr</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Monthly Living Expenses</span>
              <div className="text-xl font-bold text-rose-400 mt-1">{formatINR(totalMonthlyLivingExpenses)}/mo</div>
              <span className="text-[11px] text-slate-500">Excludes debt loan EMIs</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Monthly Surplus</span>
              <div className={`text-xl font-bold mt-1 ${netMonthlyCashSurplus >= 0 ? "text-sky-400" : "text-amber-400"}`}>
                {formatINR(netMonthlyCashSurplus)}/mo
              </div>
              <span className="text-[11px] text-slate-500">
                Savings Capacity: {totalMonthlyIncome > 0 ? ((netMonthlyCashSurplus / totalMonthlyIncome) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Income Sources Table */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  Monthly Income Sources
                </h2>
                <p className="text-xs text-slate-400">Regular recurring household inflows.</p>
              </div>
              <button
                type="button"
                onClick={addIncomeRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Income Stream
              </button>
            </div>

            <div className="space-y-3">
              {incomeList.map((inc, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Source Category</label>
                    <select
                      value={inc.category}
                      onChange={(e) => updateIncomeRow(index, "category", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      {INCOME_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={inc.monthly_amount || ""}
                      onChange={(e) => updateIncomeRow(index, "monthly_amount", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes / Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. In-hand post TDS"
                      value={inc.notes || ""}
                      onChange={(e) => updateIncomeRow(index, "notes", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={incomeList.length === 1}
                      onClick={() => removeIncomeRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Living Expenses Table */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-400" />
                  Monthly Living Expenses
                </h2>
                <p className="text-xs text-slate-400">Essential vs discretionary household operating expenses.</p>
              </div>
              <button
                type="button"
                onClick={addExpenseRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold border border-rose-500/20 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Expense Category
              </button>
            </div>

            <div className="space-y-3">
              {expenseList.map((exp, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Expense Category</label>
                    <select
                      value={exp.category}
                      onChange={(e) => updateExpenseRow(index, "category", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={exp.monthly_amount || ""}
                      onChange={(e) => updateExpenseRow(index, "monthly_amount", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Type</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.is_essential}
                        onChange={(e) => updateExpenseRow(index, "is_essential", e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      Essential
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={exp.notes || ""}
                      onChange={(e) => updateExpenseRow(index, "notes", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={expenseList.length === 1}
                      onClick={() => removeExpenseRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Balance Sheet (Assets & Liabilities) */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Balance Sheet KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Physical & Bank Assets</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatINR(totalPhysicalAssets)}</div>
              <span className="text-[11px] text-slate-500">Real estate, FDs, gold, cash</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Outstanding Debt</span>
              <div className="text-xl font-bold text-rose-400 mt-1">{formatINR(totalLiabilities)}</div>
              <span className="text-[11px] text-slate-500">Monthly EMI drag: {formatINR(totalMonthlyEMIs)}/mo</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Balance Sheet Equity</span>
              <div className="text-xl font-bold text-sky-400 mt-1">
                {formatINR(totalPhysicalAssets - totalLiabilities)}
              </div>
              <span className="text-[11px] text-slate-500">Excludes market investment portfolio</span>
            </div>
          </div>

          {/* Physical & Fixed Assets */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  Assets (Physical, Real Estate, FDs)
                </h2>
                <p className="text-xs text-slate-400">Record tangible and fixed property assets.</p>
              </div>
              <button
                type="button"
                onClick={addAssetRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Asset Item
              </button>
            </div>

            <div className="space-y-3">
              {assetList.map((asset, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Asset Category</label>
                    <select
                      value={asset.asset_category}
                      onChange={(e) => updateAssetRow(index, "asset_category", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      {ASSET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. 3BHK Flat, Thane West"
                      value={asset.description}
                      onChange={(e) => updateAssetRow(index, "description", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Current Valuation (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12500000"
                      value={asset.current_market_value || ""}
                      onChange={(e) => updateAssetRow(index, "current_market_value", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Liquidity</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={asset.is_liquid}
                        onChange={(e) => updateAssetRow(index, "is_liquid", e.target.checked)}
                        className="rounded text-sky-500 focus:ring-sky-500"
                      />
                      Liquid Cash / FD
                    </label>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={assetList.length === 1}
                      onClick={() => removeAssetRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Liabilities & Loans Table */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Liabilities & Loans
                </h2>
                <p className="text-xs text-slate-400">Track outstanding loan balances, interest rates, and EMIs.</p>
              </div>
              <button
                type="button"
                onClick={addLiabilityRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold border border-rose-500/20 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Loan / Liability
              </button>
            </div>

            <div className="space-y-3">
              {liabilityList.map((lia, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Liability Type</label>
                    <select
                      value={lia.liability_type}
                      onChange={(e) => updateLiabilityRow(index, "liability_type", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      {LIABILITY_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Lender Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={lia.lender_name || ""}
                      onChange={(e) => updateLiabilityRow(index, "lender_name", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Principal Due (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={lia.outstanding_principal || ""}
                      onChange={(e) => updateLiabilityRow(index, "outstanding_principal", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly EMI (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={lia.monthly_emi || ""}
                      onChange={(e) => updateLiabilityRow(index, "monthly_emi", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Rate % / Tenure</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Rate %"
                        value={lia.annual_interest_rate || ""}
                        onChange={(e) => updateLiabilityRow(index, "annual_interest_rate", Number(e.target.value))}
                        className="w-1/2 px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Months"
                        value={lia.tenure_remaining_months || ""}
                        onChange={(e) => updateLiabilityRow(index, "tenure_remaining_months", Number(e.target.value))}
                        className="w-1/2 px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={liabilityList.length === 1}
                      onClick={() => removeLiabilityRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Investment Portfolio */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Portfolio KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Market Value</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatINR(totalInvestments)}</div>
              <span className="text-[11px] text-slate-500">Active portfolio valuation</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Invested Cost</span>
              <div className="text-xl font-bold text-slate-200 mt-1">{formatINR(totalInvestedPrincipal)}</div>
              <span className="text-[11px] text-slate-500">Principal capital outlay</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unrealized Gain / Loss</span>
              <div className={`text-xl font-bold mt-1 ${totalInvestments >= totalInvestedPrincipal ? "text-emerald-400" : "text-rose-400"}`}>
                {formatINR(totalInvestments - totalInvestedPrincipal)}
              </div>
              <span className="text-[11px] text-slate-500">
                {totalInvestedPrincipal > 0
                  ? (((totalInvestments - totalInvestedPrincipal) / totalInvestedPrincipal) * 100).toFixed(1)
                  : 0}% Absolute Return
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly SIP Book</span>
              <div className="text-xl font-bold text-purple-400 mt-1">{formatINR(totalSIPVolume)}/mo</div>
              <span className="text-[11px] text-slate-500">Automated systematic flow</span>
            </div>
          </div>

          {/* Investment Holdings Table */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  Mutual Fund & Equity Portfolios
                </h2>
                <p className="text-xs text-slate-400">Track mutual fund schemes, direct stocks, CAGR targets, and SIPs.</p>
              </div>
              <button
                type="button"
                onClick={addInvestmentRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold border border-purple-500/20 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Holding
              </button>
            </div>

            <div className="space-y-3">
              {investmentList.map((inv, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Asset Class</label>
                    <select
                      value={inv.asset_class}
                      onChange={(e) => updateInvestmentRow(index, "asset_class", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      {ASSET_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Scheme / Instrument Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Parag Parikh Flexi Cap Fund"
                      value={inv.scheme_instrument_name}
                      onChange={(e) => updateInvestmentRow(index, "scheme_instrument_name", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Current Value (₹)</label>
                    <input
                      type="number"
                      placeholder="Current Value"
                      value={inv.current_value || ""}
                      onChange={(e) => updateInvestmentRow(index, "current_value", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly SIP (₹)</label>
                    <input
                      type="number"
                      placeholder="SIP Amount"
                      value={inv.monthly_sip_amount || ""}
                      onChange={(e) => updateInvestmentRow(index, "monthly_sip_amount", Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CAGR %</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="12%"
                      value={inv.expected_return_cagr || ""}
                      onChange={(e) => updateInvestmentRow(index, "expected_return_cagr", Number(e.target.value))}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={investmentList.length === 1}
                      onClick={() => removeInvestmentRow(index)}
                      className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Comprehensive Review & Submission */}
      {currentStep === 5 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Fact-Find Summary & Confirmation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review all financial figures before generating the final net-worth dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Client Identity</div>
              <div className="text-sm font-bold text-white">{personal.full_name}</div>
              <div className="text-xs text-slate-400">DOB: {personal.date_of_birth} &bull; PAN: {personal.pan_number || "N/A"}</div>
              <div className="text-xs text-slate-400">Risk Profile: <span className="text-emerald-400 font-semibold">{personal.risk_profile}</span></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cash Flow Summary</div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Monthly Inflows:</span>
                <span className="text-white font-semibold">{formatINR(totalMonthlyIncome)}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Monthly Outflows:</span>
                <span className="text-rose-400 font-semibold">{formatINR(totalMonthlyOutflow)}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Net Monthly Savings:</span>
                <span className="text-emerald-400 font-bold">{formatINR(netMonthlyCashSurplus)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Computed Net Worth</div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Gross Assets (Physical + Portfolio):</span>
                <span className="text-white font-semibold">{formatINR(grandTotalAssets)}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Outstanding Liabilities:</span>
                <span className="text-rose-400 font-semibold">{formatINR(totalLiabilities)}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Consolidated Family Net Worth:</span>
                <span className="text-sky-400 font-bold text-sm">{formatINR(grandNetWorth)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Planning Disclosures & Advisor Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Fact-find conducted in-person. Client prioritizes emergency liquidity buffer and child's Ivy League education target in 2029."
              value={personal.planning_disclosures_notes}
              onChange={(e) => setPersonal({ ...personal, planning_disclosures_notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      )}

      {/* Stepper Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
            >
              <ArrowLeft className="h-4 w-4" /> Previous Step
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs text-white font-semibold shadow-md shadow-sky-500/20 transition"
            >
              Next Step <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs text-white font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Fact-Find...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Complete & Generate Net Worth
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

