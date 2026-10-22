"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Sparkles,
  GraduationCap,
  Home,
  CreditCard,
  Target,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Percent,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
  Repeat
} from "lucide-react";

function formatINR(val: number) {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-₹" : "₹";
  if (abs >= 10000000) {
    return `${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    return `${prefix}${(abs / 100000).toFixed(2)} L`;
  } else {
    return `${prefix}${Math.round(abs).toLocaleString("en-IN")}`;
  }
}

export type CalculatorType =
  | "sip"
  | "lumpsum"
  | "retirement_corpus"
  | "education_fund"
  | "stepup_sip"
  | "loan_emi"
  | "smart_goal"
  | "retirement_needed"
  | "smart_retirement";

export default function FinancialCalculators() {
  const [activeCalc, setActiveCalc] = useState<CalculatorType>("sip");

  const calculatorList = [
    {
      id: "sip" as CalculatorType,
      name: "SIP Calculator",
      shortDesc: "Monthly SIP future value with compounding",
      icon: TrendingUp,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      id: "lumpsum" as CalculatorType,
      name: "Lumpsum Calculator",
      shortDesc: "One-time investment growth over time",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      id: "retirement_corpus" as CalculatorType,
      name: "Retirement Corpus (SIP)",
      shortDesc: "SIP future value with inflation adjustment",
      icon: Clock,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      id: "education_fund" as CalculatorType,
      name: "Child Education Fund",
      shortDesc: "Higher education corpus needed by admission age",
      icon: GraduationCap,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      id: "stepup_sip" as CalculatorType,
      name: "Step-Up SIP / STP",
      shortDesc: "SIP with annual % or ₹ increment step-up",
      icon: Repeat,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      id: "loan_emi" as CalculatorType,
      name: "Loan EMI Calculator",
      shortDesc: "Monthly EMI and interest breakdown",
      icon: CreditCard,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    {
      id: "smart_goal" as CalculatorType,
      name: "Smart Goal Calculator",
      shortDesc: "Combined corpus + ongoing monthly SIP",
      icon: Target,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    {
      id: "retirement_needed" as CalculatorType,
      name: "Retirement Corpus Needed",
      shortDesc: "Living expenses & inflation to target corpus",
      icon: ShieldCheck,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      id: "smart_retirement" as CalculatorType,
      name: "Smart Retirement Engine",
      shortDesc: "Corpus needed vs projected + required top-up SIP",
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Selector Grid */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-sky-500" />
              <span>Financial &amp; Mutual Fund Calculators Suite</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive wealth planning engines for advisors, distributors, and investors.
            </p>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            9 Specialized Engines
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {calculatorList.map((c) => {
            const Icon = c.icon;
            const isSelected = activeCalc === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCalc(c.id)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-sky-500 text-white border-sky-600 shadow-md font-bold"
                    : "bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-white/20 text-white" : `${c.bg} ${c.color}`}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <div>
                  <div className={`text-[11px] leading-tight ${isSelected ? "text-white font-bold" : "font-semibold text-slate-900 dark:text-white"}`}>
                    {c.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Calculator Renderer */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {activeCalc === "sip" && <SipCalculator />}
        {activeCalc === "lumpsum" && <LumpsumCalculator />}
        {activeCalc === "retirement_corpus" && <RetirementCorpusCalculator />}
        {activeCalc === "education_fund" && <EducationFundCalculator />}
        {activeCalc === "stepup_sip" && <StepUpSipCalculator />}
        {activeCalc === "loan_emi" && <LoanEmiCalculator />}
        {activeCalc === "smart_goal" && <SmartGoalCalculator />}
        {activeCalc === "retirement_needed" && <RetirementNeededCalculator />}
        {activeCalc === "smart_retirement" && <SmartRetirementCalculator />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. SIP CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function SipCalculator() {
  const [monthlySip, setMonthlySip] = useState(15000);
  const [expectedReturn, setExpectedReturn] = useState(12.5);
  const [tenureYears, setTenureYears] = useState(10);

  const { totalInvested, wealthGained, futureValue, yearlyBreakdown } = useMemo(() => {
    const months = tenureYears * 12;
    const i = expectedReturn / 12 / 100;
    const fv = monthlySip * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    const invested = monthlySip * months;
    const gain = fv - invested;

    const breakdown: any[] = [];
    for (let y = 1; y <= tenureYears; y++) {
      const m = y * 12;
      const yFv = monthlySip * (((Math.pow(1 + i, m) - 1) / i) * (1 + i));
      const yInv = monthlySip * m;
      breakdown.push({ year: y, invested: Math.round(yInv), value: Math.round(yFv) });
    }

    return {
      totalInvested: Math.round(invested),
      wealthGained: Math.round(gain),
      futureValue: Math.round(fv),
      yearlyBreakdown: breakdown,
    };
  }, [monthlySip, expectedReturn, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Mutual Fund SIP Calculator</h4>
          <p className="text-xs text-slate-500">Calculate wealth accumulated through disciplined monthly SIP compounding.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
          Monthly SIP Compounding
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders & Inputs */}
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly SIP Amount</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{formatINR(monthlySip)}</span>
            </div>
            <input
              type="range"
              min={500}
              max={200000}
              step={500}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>₹500</span>
              <span>₹2,00,000</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Expected Annual Return Rate (p.a.)</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{expectedReturn}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1%</span>
              <span>30%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Investment Tenure (Years)</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{tenureYears} Years ({tenureYears * 12} Months)</span>
            </div>
            <input
              type="range"
              min={1}
              max={35}
              step={1}
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1 Year</span>
              <span>35 Years</span>
            </div>
          </div>
        </div>

        {/* Output Metrics */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Invested</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(totalInvested)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Estimated Returns</span>
              <div className="text-base font-bold text-emerald-500 mt-0.5">+{formatINR(wealthGained)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Maturity Future Value
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(futureValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Wealth multiplied by <span className="font-bold text-sky-500">{(futureValue / (totalInvested || 1)).toFixed(1)}x</span>
            </p>
          </div>

          {/* Ratio Progress Bar */}
          <div>
            <div className="h-3 w-full bg-emerald-500 rounded-full overflow-hidden flex">
              <div
                className="bg-sky-500 h-full"
                style={{ width: `${Math.round((totalInvested / (futureValue || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500 inline-block" /> Invested ({Math.round((totalInvested / (futureValue || 1)) * 100)}%)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Wealth Gain ({Math.round((wealthGained / (futureValue || 1)) * 100)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LUMPSUM CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function LumpsumCalculator() {
  const [corpus, setCorpus] = useState(250000);
  const [expectedReturn, setExpectedReturn] = useState(12.0);
  const [tenureYears, setTenureYears] = useState(10);

  const { invested, wealthGained, futureValue } = useMemo(() => {
    const fv = corpus * Math.pow(1 + expectedReturn / 100, tenureYears);
    const gain = fv - corpus;
    return {
      invested: corpus,
      wealthGained: Math.round(gain),
      futureValue: Math.round(fv),
    };
  }, [corpus, expectedReturn, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Lumpsum Investment Calculator</h4>
          <p className="text-xs text-slate-500">Calculate future value for one-time capital investment.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          One-Time Compounding
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Initial Capital Investment</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(corpus)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={5000000}
              step={10000}
              value={corpus}
              onChange={(e) => setCorpus(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>₹10,000</span>
              <span>₹50,00,000</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Expected Annual Return Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{expectedReturn}% p.a.</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Duration (Years)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{tenureYears} Years</span>
            </div>
            <input
              type="range"
              min={1}
              max={35}
              step={1}
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Initial Invested</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(invested)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Gain</span>
              <div className="text-base font-bold text-emerald-500 mt-0.5">+{formatINR(wealthGained)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Maturity Future Value
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(futureValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Capital grew by <span className="font-bold text-emerald-500">{((futureValue / (invested || 1)) * 100 - 100).toFixed(0)}%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. RETIREMENT CORPUS CALCULATOR (SIP-driven Accumulation with Inflation)
───────────────────────────────────────────────────────────────────────────── */
function RetirementCorpusCalculator() {
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [monthlySip, setMonthlySip] = useState(25000);
  const [expectedReturn, setExpectedReturn] = useState(12.0);
  const [inflationRate, setInflationRate] = useState(6.0);

  const { workingYears, totalInvested, nominalFv, realPurchasingPower } = useMemo(() => {
    const years = Math.max(1, retirementAge - currentAge);
    const months = years * 12;
    const i = expectedReturn / 12 / 100;
    const fv = monthlySip * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    const invested = monthlySip * months;
    const realFv = fv / Math.pow(1 + inflationRate / 100, years);

    return {
      workingYears: years,
      totalInvested: Math.round(invested),
      nominalFv: Math.round(fv),
      realPurchasingPower: Math.round(realFv),
    };
  }, [currentAge, retirementAge, monthlySip, expectedReturn, inflationRate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Retirement Corpus (SIP Accumulation)</h4>
          <p className="text-xs text-slate-500">Calculate accumulated retirement wealth and its inflation-adjusted value.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          Inflation Adjusted
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Age</label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Retirement Age</label>
              <input
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly SIP</span>
              <span className="font-bold text-indigo-500">{formatINR(monthlySip)}/mo</span>
            </div>
            <input
              type="range"
              min={1000}
              max={250000}
              step={1000}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Return Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Inflation Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Years to Invest</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{workingYears} Years</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total SIP Invested</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(totalInvested)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Nominal Retirement Corpus at Age {retirementAge}
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(nominalFv)}
            </div>
            <div className="mt-2 pt-2 border-t border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
              Today&rsquo;s Purchasing Power: <span className="font-bold">{formatINR(realPurchasingPower)}</span> (adjusted for {inflationRate}% inflation)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. EDUCATION FUND REQUIRED CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function EducationFundCalculator() {
  const [currentAge, setCurrentAge] = useState(3);
  const [admissionAge, setAdmissionAge] = useState(18);
  const [monthlySip, setMonthlySip] = useState(15000);
  const [expectedReturn, setExpectedReturn] = useState(12.0);
  const [educationInflation, setEducationInflation] = useState(8.0);

  const { yearsLeft, totalInvested, futureValue, realValue } = useMemo(() => {
    const years = Math.max(1, admissionAge - currentAge);
    const months = years * 12;
    const i = expectedReturn / 12 / 100;
    const fv = monthlySip * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    const invested = monthlySip * months;
    const realFv = fv / Math.pow(1 + educationInflation / 100, years);

    return {
      yearsLeft: years,
      totalInvested: Math.round(invested),
      futureValue: Math.round(fv),
      realValue: Math.round(realFv),
    };
  }, [currentAge, admissionAge, monthlySip, expectedReturn, educationInflation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Child Education Fund Calculator</h4>
          <p className="text-xs text-slate-500">Plan corpus required by college/higher education age.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
          Education Goal
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Child&rsquo;s Current Age</label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">College Admission Age</label>
              <input
                type="number"
                value={admissionAge}
                onChange={(e) => setAdmissionAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Monthly SIP</span>
              <span className="font-bold text-purple-500">{formatINR(monthlySip)}/mo</span>
            </div>
            <input
              type="range"
              min={1000}
              max={150000}
              step={1000}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Return Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Education Inflation (%)</label>
              <input
                type="number"
                step="0.5"
                value={educationInflation}
                onChange={(e) => setEducationInflation(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Total Education Fund Accumulated (In {yearsLeft} Years)
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(futureValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Out-of-Pocket Invested: <span className="font-bold">{formatINR(totalInvested)}</span>
            </p>
            <div className="mt-2 pt-2 border-t border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 font-semibold">
              Today&rsquo;s Course Cost Equivalent: <span className="font-bold">{formatINR(realValue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. STEP-UP SIP / STP CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function StepUpSipCalculator() {
  const [startingSip, setStartingSip] = useState(15000);
  const [stepUpType, setStepUpType] = useState<"percentage" | "amount">("percentage");
  const [stepUpValue, setStepUpValue] = useState(10); // 10% or ₹2000
  const [expectedReturn, setExpectedReturn] = useState(12.0);
  const [tenureYears, setTenureYears] = useState(15);

  const { totalInvested, futureValue, flatSipFv, extraWealthGained } = useMemo(() => {
    const monthlyRate = expectedReturn / 12 / 100;
    const totalMonths = tenureYears * 12;

    let invested = 0;
    let fv = 0;

    for (let m = 1; m <= totalMonths; m++) {
      const yearIdx = Math.floor((m - 1) / 12);
      let currentMonthSip = startingSip;
      if (stepUpType === "percentage") {
        currentMonthSip = startingSip * Math.pow(1 + stepUpValue / 100, yearIdx);
      } else {
        currentMonthSip = startingSip + yearIdx * stepUpValue;
      }

      invested += currentMonthSip;
      // Compounded to end of tenure:
      const monthsCompounding = totalMonths - m + 1;
      fv += currentMonthSip * Math.pow(1 + monthlyRate, monthsCompounding);
    }

    // Flat SIP for comparison:
    const flatFv = startingSip * (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));

    return {
      totalInvested: Math.round(invested),
      futureValue: Math.round(fv),
      flatSipFv: Math.round(flatFv),
      extraWealthGained: Math.round(fv - flatFv),
    };
  }, [startingSip, stepUpType, stepUpValue, expectedReturn, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Step-Up SIP / STP Calculator</h4>
          <p className="text-xs text-slate-500">Accelerate wealth by periodically increasing your SIP contributions with salary growth.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          Annual Step-Up Increment
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Initial Monthly SIP</span>
              <span className="font-bold text-amber-500">{formatINR(startingSip)}/mo</span>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={startingSip}
              onChange={(e) => setStartingSip(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Step-Up Mode</label>
              <select
                value={stepUpType}
                onChange={(e) => {
                  setStepUpType(e.target.value as any);
                  setStepUpValue(e.target.value === "percentage" ? 10 : 2000);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              >
                <option value="percentage">Annual Percentage (%)</option>
                <option value="amount">Fixed Amount (₹ / yr)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {stepUpType === "percentage" ? "Annual Increase (%)" : "Annual Increase (₹)"}
              </label>
              <input
                type="number"
                value={stepUpValue}
                onChange={(e) => setStepUpValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Return Rate (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Years)</label>
              <input
                type="number"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Future Value with Step-Up SIP
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(futureValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Invested: <span className="font-bold text-slate-900 dark:text-white">{formatINR(totalInvested)}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase">Normal Flat SIP Value</span>
              <div className="font-semibold text-slate-600 dark:text-slate-300">{formatINR(flatSipFv)}</div>
            </div>
            <div className="text-right">
              <span className="text-emerald-500 text-[10px] uppercase font-bold">Extra Wealth Generated</span>
              <div className="text-base font-black text-emerald-500">+{formatINR(extraWealthGained)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. LOAN EMI CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function LoanEmiCalculator() {
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);

  const { monthlyEmi, totalInterest, totalPayment } = useMemo(() => {
    const rm = interestRate / 12 / 100;
    const n = tenureYears * 12;
    const emi = (loanAmount * rm * Math.pow(1 + rm, n)) / (Math.pow(1 + rm, n) - 1);
    const totalPay = emi * n;
    const interest = totalPay - loanAmount;

    return {
      monthlyEmi: Math.round(emi),
      totalInterest: Math.round(interest),
      totalPayment: Math.round(totalPay),
    };
  }, [loanAmount, interestRate, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Loan EMI Calculator</h4>
          <p className="text-xs text-slate-500">Calculate home, car, or personal loan monthly EMIs and total interest.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
          Amortization &amp; EMI
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Loan Principal Amount</span>
              <span className="font-bold text-rose-500">{formatINR(loanAmount)}</span>
            </div>
            <input
              type="range"
              min={100000}
              max={20000000}
              step={50000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Annual Interest Rate</span>
              <span className="font-bold text-rose-500">{interestRate}% p.a.</span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              step={0.1}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Loan Tenure (Years)</span>
              <span className="font-bold text-rose-500">{tenureYears} Years ({tenureYears * 12} Months)</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Monthly Equated Installment (EMI)
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(monthlyEmi)}/mo
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Interest Payable</span>
              <div className="text-base font-bold text-rose-500 mt-0.5">{formatINR(totalInterest)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Payment (P + I)</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(totalPayment)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   7. SMART GOAL CALCULATOR (Corpus + Monthly SIP)
───────────────────────────────────────────────────────────────────────────── */
function SmartGoalCalculator() {
  const [existingCorpus, setExistingCorpus] = useState(1000000);
  const [corpusReturn, setCorpusReturn] = useState(11.0);
  const [monthlySip, setMonthlySip] = useState(20000);
  const [sipReturn, setSipReturn] = useState(13.0);
  const [tenureYears, setTenureYears] = useState(10);

  const { corpusFv, sipFv, totalFv, totalInvested } = useMemo(() => {
    const cFv = existingCorpus * Math.pow(1 + corpusReturn / 100, tenureYears);
    const months = tenureYears * 12;
    const i = sipReturn / 12 / 100;
    const sFv = monthlySip * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    const invested = existingCorpus + monthlySip * months;

    return {
      corpusFv: Math.round(cFv),
      sipFv: Math.round(sFv),
      totalFv: Math.round(cFv + sFv),
      totalInvested: Math.round(invested),
    };
  }, [existingCorpus, corpusReturn, monthlySip, sipReturn, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Smart Goal Calculator</h4>
          <p className="text-xs text-slate-500">Dual-engine calculation combining existing seed capital and ongoing monthly SIPs.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-500/10 text-teal-500 border border-teal-500/20">
          Corpus + SIP
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Existing Corpus (₹)</label>
              <input
                type="number"
                value={existingCorpus}
                onChange={(e) => setExistingCorpus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Corpus Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={corpusReturn}
                onChange={(e) => setCorpusReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly SIP (₹)</label>
              <input
                type="number"
                value={monthlySip}
                onChange={(e) => setMonthlySip(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SIP Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={sipReturn}
                onChange={(e) => setSipReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tenure (Years)</label>
            <input
              type="number"
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Total Combined Target Wealth
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(totalFv)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total Invested: {formatINR(totalInvested)} &bull; Gain: +{formatINR(totalFv - totalInvested)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Corpus Share</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(corpusFv)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">SIP Share</span>
              <div className="text-sm font-bold text-teal-500 mt-0.5">{formatINR(sipFv)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. RETIREMENT CORPUS NEEDED CALCULATOR
───────────────────────────────────────────────────────────────────────────── */
function RetirementNeededCalculator() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(60);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [monthlyExpense, setMonthlyExpense] = useState(75000);
  const [inflationRate, setInflationRate] = useState(6.0);
  const [postRetReturn, setPostRetReturn] = useState(8.0);

  const { workYears, retYears, monthlyExpenseAtRet, corpusNeeded } = useMemo(() => {
    const wYears = Math.max(1, retirementAge - currentAge);
    const rYears = Math.max(1, lifeExpectancy - retirementAge);

    // Monthly expense inflated to retirement age
    const mExpenseRet = monthlyExpense * Math.pow(1 + inflationRate / 100, wYears);
    const annualExpenseRet = mExpenseRet * 12;

    // Real rate of return in retirement
    const realRate = (1 + postRetReturn / 100) / (1 + inflationRate / 100) - 1;

    // Present value of growing annuity at retirement
    let needed = 0;
    if (Math.abs(realRate) < 0.0001) {
      needed = annualExpenseRet * rYears;
    } else {
      needed = annualExpenseRet * ((1 - Math.pow(1 + realRate, -rYears)) / realRate) * (1 + realRate);
    }

    return {
      workYears: wYears,
      retYears: rYears,
      monthlyExpenseAtRet: Math.round(mExpenseRet),
      corpusNeeded: Math.round(needed),
    };
  }, [currentAge, retirementAge, lifeExpectancy, monthlyExpense, inflationRate, postRetReturn]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Retirement Corpus Needed Calculator</h4>
          <p className="text-xs text-slate-500">Calculate the target lump-sum corpus required on retirement day to sustain your lifestyle.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
          Target Corpus Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Age</label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Retirement Age</label>
              <input
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Life Expectancy</label>
              <input
                type="number"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Current Monthly Living Expenses</span>
              <span className="font-bold text-cyan-500">{formatINR(monthlyExpense)}/mo</span>
            </div>
            <input
              type="range"
              min={10000}
              max={500000}
              step={5000}
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Inflation Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Post-Retirement Return (%)</label>
              <input
                type="number"
                step="0.5"
                value={postRetReturn}
                onChange={(e) => setPostRetReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Total Retirement Corpus Needed on Day 1
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(corpusNeeded)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Required to sustain {retYears} years in retirement
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Inflated Monthly Cost</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(monthlyExpenseAtRet)}/mo</div>
              <span className="text-[10px] text-slate-400">at age {retirementAge}</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Years to Save</span>
              <div className="text-sm font-bold text-cyan-500 mt-0.5">{workYears} Years Left</div>
              <span className="text-[10px] text-slate-400">{workYears * 12} installments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. SMART RETIREMENT ENGINE (Comprehensive Gap & Action Plan)
───────────────────────────────────────────────────────────────────────────── */
function SmartRetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(60);
  const [monthlyExpense, setMonthlyExpense] = useState(80000);
  const [inflationRate, setInflationRate] = useState(6.0);
  const [existingCorpus, setExistingCorpus] = useState(2500000);
  const [corpusReturn, setCorpusReturn] = useState(11.0);
  const [ongoingSip, setOngoingSip] = useState(30000);
  const [sipReturn, setSipReturn] = useState(12.5);
  const [postRetReturn, setPostRetReturn] = useState(8.0);

  const {
    wYears,
    corpusNeeded,
    projectedCorpusFv,
    projectedSipFv,
    totalProjectedWealth,
    gap,
    isAchievable,
    requiredExtraSip,
    requiredLumpsumToday,
  } = useMemo(() => {
    const years = Math.max(1, retirementAge - currentAge);
    const retYears = Math.max(1, 85 - retirementAge);

    // 1. Target Corpus Needed
    const mExpenseRet = monthlyExpense * Math.pow(1 + inflationRate / 100, years);
    const annualExpenseRet = mExpenseRet * 12;
    const realRate = (1 + postRetReturn / 100) / (1 + inflationRate / 100) - 1;
    let needed = 0;
    if (Math.abs(realRate) < 0.0001) {
      needed = annualExpenseRet * retYears;
    } else {
      needed = annualExpenseRet * ((1 - Math.pow(1 + realRate, -retYears)) / realRate) * (1 + realRate);
    }

    // 2. Projected Wealth Accumulated
    const cFv = existingCorpus * Math.pow(1 + corpusReturn / 100, years);
    const months = years * 12;
    const i = sipReturn / 12 / 100;
    const sFv = ongoingSip * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    const totalWealth = cFv + sFv;

    // 3. Gap Analysis
    const deficit = needed - totalWealth;
    const achievable = deficit <= 0;

    // 4. Action Recommendation
    let extraSip = 0;
    let extraLump = 0;
    if (deficit > 0) {
      const annuityFactor = ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
      extraSip = deficit / annuityFactor;
      extraLump = deficit / Math.pow(1 + corpusReturn / 100, years);
    }

    return {
      wYears: years,
      corpusNeeded: Math.round(needed),
      projectedCorpusFv: Math.round(cFv),
      projectedSipFv: Math.round(sFv),
      totalProjectedWealth: Math.round(totalWealth),
      gap: Math.round(deficit),
      isAchievable: achievable,
      requiredExtraSip: Math.round(extraSip),
      requiredLumpsumToday: Math.round(extraLump),
    };
  }, [
    currentAge,
    retirementAge,
    monthlyExpense,
    inflationRate,
    existingCorpus,
    corpusReturn,
    ongoingSip,
    sipReturn,
    postRetReturn,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Smart Retirement Diagnostic &amp; Action Plan</span>
          </h4>
          <p className="text-xs text-slate-500">Comprehensive gap analysis comparing target retirement corpus needed vs. projected accumulation.</p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          Full Action Engine
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Age</label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Retirement Age</label>
              <input
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Monthly Expense (₹)</label>
              <input
                type="number"
                value={monthlyExpense}
                onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Inflation Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Existing Corpus (₹)</label>
              <input
                type="number"
                value={existingCorpus}
                onChange={(e) => setExistingCorpus(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Return on Corpus (%)</label>
              <input
                type="number"
                step="0.5"
                value={corpusReturn}
                onChange={(e) => setCorpusReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ongoing Monthly SIP (₹)</label>
              <input
                type="number"
                value={ongoingSip}
                onChange={(e) => setOngoingSip(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SIP Return (% p.a.)</label>
              <input
                type="number"
                step="0.5"
                value={sipReturn}
                onChange={(e) => setSipReturn(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Results & Action Recommendation */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Target Corpus Needed</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatINR(corpusNeeded)}</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Projected Wealth</span>
              <div className="text-base font-bold text-sky-500 mt-0.5">{formatINR(totalProjectedWealth)}</div>
            </div>
          </div>

          {/* Feasibility Status */}
          {isAchievable ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" /> Goal Achievable On-Track!
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                Surplus: +{formatINR(Math.abs(gap))}
              </div>
              <p className="text-[11px] text-slate-500">
                Your current investments and SIP commitment are sufficient to fund full retirement until age 85!
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider">
                <AlertCircle className="h-4 w-4" /> Retirement Shortfall Identified
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                Gap: -{formatINR(gap)}
              </div>
              <p className="text-[11px] text-slate-500">
                Projected wealth falls short of the target inflation-adjusted corpus by retirement age.
              </p>
            </div>
          )}

          {/* Action Recommendations to Bridge Gap */}
          {!isAchievable && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Recommended Action Shifts
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="text-slate-400 text-[10px] uppercase">Increase Monthly SIP by:</div>
                  <div className="font-black text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                    +{formatINR(requiredExtraSip)}/mo
                  </div>
                  <div className="text-[10px] text-slate-500">New total: {formatINR(ongoingSip + requiredExtraSip)}/mo</div>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                  <div className="text-slate-400 text-[10px] uppercase">OR Deploy Lumpsum Today:</div>
                  <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm mt-0.5">
                    +{formatINR(requiredLumpsumToday)}
                  </div>
                  <div className="text-[10px] text-slate-500">One-time capital top-up</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
