import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getCompanyCurrency, Country } from "@/lib/api";

interface CurrencyContextType {
  currencySymbol: string;
  currencyCode: string;
  currencyName: string;
  countryCode: string;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  formatCurrencyShort: (amount: number) => string;
}

const defaultCurrency: CurrencyContextType = {
  currencySymbol: "R",
  currencyCode: "ZAR",
  currencyName: "South African Rand",
  countryCode: "ZA",
  loading: false,
  formatCurrency: (amount: number) =>
    `R${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  formatCurrencyShort: (amount: number) => `R${amount.toLocaleString("en-ZA")}`,
};

const CurrencyContext = createContext<CurrencyContextType>(defaultCurrency);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] =
    useState<CurrencyContextType>(defaultCurrency);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const raw = localStorage.getItem("user");
        if (!raw) return;

        const user = JSON.parse(raw);
        const companyId = user?.companyId;

        if (!companyId) return;

        const data = await getCompanyCurrency(companyId);

        setCurrency({
          currencySymbol: data.currencySymbol || "R",
          currencyCode: data.currencyCode || "ZAR",
          currencyName: data.currencyName || "South African Rand",
          countryCode: data.countryCode || "ZA",
          loading: false,
          formatCurrency: (amount: number) =>
            `${data.currencySymbol || "R"}${amount.toLocaleString(
              getLocale(data.countryCode),
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
          formatCurrencyShort: (amount: number) =>
            `${data.currencySymbol || "R"}${amount.toLocaleString(
              getLocale(data.countryCode)
            )}`,
        });
      } catch (err) {
        console.warn("Failed to load currency settings, using defaults", err);
      }
    };

    loadCurrency();
  }, []);

  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

// Helper to get locale from country code
function getLocale(countryCode?: string): string {
  switch (countryCode?.toUpperCase()) {
    case "ZA":
      return "en-ZA";
    case "US":
      return "en-US";
    case "GB":
      return "en-GB";
    case "NG":
      return "en-NG";
    case "KE":
      return "en-KE";
    case "GH":
      return "en-GH";
    default:
      return "en-ZA";
  }
}

// Currency symbol mappings for reference
export const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  GBP: "£",
  EUR: "€",
  NGN: "₦",
  KES: "KSh",
  GHS: "GH₵",
};

// Utility function to format currency without context (for use outside React)
export function formatCurrencyAmount(
  amount: number,
  symbol: string = "R",
  locale: string = "en-ZA"
): string {
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
