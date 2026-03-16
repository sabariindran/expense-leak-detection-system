import axios from 'axios';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host localhost
// iOS simulator and web can use localhost directly
const BASE_URL = Platform.select({
    android: 'http://192.168.1.7:8000',
    ios: 'http://192.168.1.7:8000',
    default: 'http://192.168.1.7:8000',
});

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ===========================
// Types
// ===========================

export interface DashboardData {
    total_spent: number;
    alerts: Alert[];
    habit_score: number;
    active_alerts: number;
    spending_by_merchant: MerchantSpend[];
    monthly_trend: MonthlyTrend[];
}

export interface Alert {
    type: string;
    message: string;
    severity?: string;
}

export interface MerchantSpend {
    merchant: string;
    amount: number;
}

export interface MonthlyTrend {
    month: string;
    amount: number;
}

export interface Transaction {
    id: number;
    merchant: string;
    amount: number;
    date: string;
    category: string;
    payment_method: string;
}

export interface PaymentRequest {
    merchant_name: string;
    amount: number;
    payment_method: string;
    upi_id?: string;
    description?: string;
}

export interface PaymentResponse {
    status: string;
    transaction_id: string;
}

// ===========================
// API Functions
// ===========================

export async function getDashboard(): Promise<DashboardData> {
    const response = await api.get<DashboardData>('/dashboard');
    return response.data;
}

export async function getTransactions(): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/transactions');
    return response.data;
}

export async function makePayment(data: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>('/pay', data);
    return response.data;
}

export default api;
