import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Currency formatter
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

// Chart color palette
const COLORS = [
  '#0f766e',
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#a7f3d0',
  '#ecfdf5'
];

const API_BASE_URL = 'http://127.0.0.1:8000';

const App = () => {
  // Global state
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error
  const [transactionId, setTransactionId] = useState('');
  
  // Payment form state
  const [upiId, setUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentMode, setPaymentMode] = useState('manual'); // manual, qr
  const [qrStream, setQrStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
      
      // Show alerts as notifications
      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
          showToast(alert.message, 'warning');
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load and periodic refresh
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // QR Scanner setup
  useEffect(() => {
    if (paymentMode === 'qr' && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          setQrStream(stream);
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        })
        .catch(err => {
          console.error('Error accessing camera:', err);
          showToast('Camera access denied. Please enable camera permissions.', 'error');
        });
    }
    
    return () => {
      if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [paymentMode]);

  // Toast notification handler
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => prev.show ? { ...prev, show: false } : prev);
    }, 5000);
  };

  // Handle manual payment submission
  const handleManualPayment = async (e) => {
    e.preventDefault();
    if (!upiId || !merchantName || !amount || parseFloat(amount) <= 0) {
      showToast('Please fill all fields with valid values', 'error');
      return;
    }

    setPaymentStatus('processing');
    
    try {
      const response = await fetch(`${API_BASE_URL}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: upiId,
          merchant_name: merchantName,
          amount: parseFloat(amount),
          payment_method: paymentMethod
        })
      });

      if (!response.ok) throw new Error('Payment failed');
      
      const data = await response.json();
      setTransactionId(data.transaction_id || 'TXN' + Date.now().toString(36).toUpperCase());
      setPaymentStatus('success');
      
      // Reset form after success
      setUpiId('');
      setMerchantName('');
      setAmount('');
      
      // Refresh dashboard data
      fetchDashboardData();
      
      showToast('Payment successful!', 'success');
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      showToast(error.message || 'Payment failed. Please try again.', 'error');
    }
  };

  // Simulate QR scan (in real implementation, this would decode QR content)
  const simulateQRScan = () => {
    // In a real implementation, this would decode the QR code and extract merchant info
    setMerchantName('Test Merchant');
    showToast('QR scanned successfully! Please enter amount.', 'success');
  };

  // Handle QR payment submission
  const handleQRPayment = async () => {
    if (!merchantName || !amount || parseFloat(amount) <= 0) {
      showToast('Please enter merchant name and valid amount', 'error');
      return;
    }

    setPaymentStatus('processing');
    
    try {
      const response = await fetch(`${API_BASE_URL}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: merchantName,
          amount: parseFloat(amount),
          payment_method: 'QR'
        })
      });

      if (!response.ok) throw new Error('Payment failed');
      
      const data = await response.json();
      setTransactionId(data.transaction_id || 'TXN' + Date.now().toString(36).toUpperCase());
      setPaymentStatus('success');
      
      // Reset form
      setMerchantName('');
      setAmount('');
      
      // Refresh dashboard data
      fetchDashboardData();
      
      showToast('QR Payment successful!', 'success');
    } catch (error) {
      console.error('QR Payment error:', error);
      setPaymentStatus('error');
      showToast(error.message || 'Payment failed. Please try again.', 'error');
    }
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setPaymentStatus('idle');
    setTransactionId('');
    setCurrentPage('dashboard');
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Chart colors
  const COLORS = ['#0f766e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ecfdf5'];

  return (
    <div className={`min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
      {/* Sidebar Navigation */}
      <motion.div 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="w-64 bg-white dark:bg-gray-800 shadow-lg fixed h-full z-50"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xl">ℰ</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-800 dark:text-white">ExpenseGuard</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Intelligent Leak Detection</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-6 px-4">
          <SidebarItem 
            icon="📊" 
            label="Dashboard" 
            active={currentPage === 'dashboard'} 
            onClick={() => setCurrentPage('dashboard')} 
          />
          <SidebarItem 
            icon="💳" 
            label="New Payment" 
            active={currentPage === 'payment'} 
            onClick={() => {
              setCurrentPage('payment');
              setPaymentStatus('idle');
            }} 
          />
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <SidebarItem 
              icon="🌙" 
              label={darkMode ? "Light Mode" : "Dark Mode"} 
              active={false} 
              onClick={() => setDarkMode(!darkMode)} 
            />
            <SidebarItem 
              icon="ℹ️" 
              label="About" 
              active={false} 
              onClick={() => showToast('Final Year Project | B.Sc. AI & Data Analytics', 'info')} 
            />
          </div>
        </nav>
        
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Developed by:</p>
            <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">Sabari Indran K, Harini, Abeer</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">B.Sc. Artificial Intelligence and Data Analytics</p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 pt-8 px-6 pb-12">
        <AnimatePresence mode="wait">
          {paymentStatus === 'processing' ? (
            <ProcessingScreen key="processing" />
          ) : paymentStatus === 'success' ? (
            <SuccessScreen 
              key="success" 
              transactionId={transactionId} 
              onBackToDashboard={resetPaymentFlow} 
            />
          ) : currentPage === 'dashboard' ? (
            <DashboardPage 
              key="dashboard" 
              dashboardData={dashboardData} 
              loading={loading} 
              onRefresh={fetchDashboardData} 
            />
          ) : (
            <PaymentPage 
              key="payment" 
              paymentMode={paymentMode} 
              setPaymentMode={setPaymentMode} 
              upiId={upiId} 
              setUpiId={setUpiId} 
              merchantName={merchantName} 
              setMerchantName={setMerchantName} 
              amount={amount} 
              setAmount={setAmount} 
              paymentMethod={paymentMethod} 
              setPaymentMethod={setPaymentMethod} 
              handleManualPayment={handleManualPayment} 
              handleQRPayment={handleQRPayment} 
              simulateQRScan={simulateQRScan} 
              videoRef={videoRef} 
              canvasRef={canvasRef} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 15 }}
            className={`fixed bottom-6 right-6 max-w-md p-4 rounded-xl shadow-lg flex items-center space-x-3 z-50 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            } text-white`}
          >
            <div className="text-2xl">
              {toast.type === 'success' ? '✓' : 
               toast.type === 'error' ? '✗' : 
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <p className="font-medium">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sidebar Item Component
const SidebarItem = ({ icon, label, active, onClick }) => {
  return (
    <motion.button
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded-xl mb-2 transition-colors ${
        active 
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <span className="text-xl mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
    </motion.button>
  );
};

// Dashboard Page Component
const DashboardPage = ({ dashboardData, loading, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
    // Show feedback
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('showToast', { 
        detail: { message: 'Dashboard refreshed!', type: 'info' } 
      }));
    }, 100);
  };

  // Format data for charts
  const spendingData = dashboardData?.spending_by_merchant?.map(item => ({
    name: item.merchant,
    value: item.amount
  })) || [];

  const monthlyData = dashboardData?.monthly_trend?.map(item => ({
    month: item.month,
    amount: item.amount
  })) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Expense leak analytics and insights</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
            refreshing || loading
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {refreshing || loading ? (
            <>
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <span>⟳</span>
              <span>Refresh</span>
            </>
          )}
        </motion.button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title="Total Spent" 
          value={loading ? '--' : formatCurrency(dashboardData?.total_spent || 0)} 
          icon="💰" 
          loading={loading}
          trend={dashboardData?.spending_trend}
        />
        <KpiCard 
          title="Habit Score" 
          value={loading ? '--' : `${dashboardData?.habit_score || 0}/100`} 
          icon="⭐" 
          loading={loading}
          description="Based on spending patterns"
        />
        <KpiCard 
          title="Active Alerts" 
          value={loading ? '--' : (dashboardData?.active_alerts || 0)} 
          icon="⚠️" 
          loading={loading}
          description="Requires attention"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Merchant - Donut Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Spending by Merchant</h2>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {loading ? '--' : formatCurrency(dashboardData?.total_spent || 0)}
            </span>
          </div>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin"></div>
            </div>
          ) : spendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {spendingData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => (
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-4">EmptyEntries</div>
              <p>No spending data available</p>
            </div>
          )}
        </div>

        {/* Monthly Trend - Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Monthly Spending Trend</h2>
            <span className="text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
              Last 6 Months
            </span>
          </div>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin"></div>
            </div>
          ) : monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Amount']} 
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#0f766e" 
                  radius={[4, 4, 0, 0]}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-4">EmptyEntries</div>
              <p>No trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Active Alerts</h2>
          <span className="text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full">
            {loading ? '--' : `${dashboardData?.active_alerts || 0} alerts`}
          </span>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.alerts.map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-amber-700 dark:text-amber-300 text-lg">⚠️</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{alert.message}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {alert.type === 'micro_spending' && 'Micro spending leak detected'}
                    {alert.type === 'merchant_concentration' && 'High concentration with single merchant'}
                    {alert.type === 'growth_pattern' && 'Unusual spending growth pattern'}
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-xs text-amber-700 dark:text-amber-300">
                    <span>Severity: {alert.severity}</span>
                    <span>Detected: {new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-xl font-medium">No active alerts</p>
            <p className="mt-2 text-center max-w-md">
              Your spending patterns look healthy. We'll notify you if any expense leaks are detected.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// KPI Card Component
const KpiCard = ({ title, value, icon, loading, trend, description }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">{value}</p>
          )}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
          {trend && !loading && (
            <div className={`flex items-center mt-2 text-xs ${
              trend > 0 ? 'text-rose-500' : 'text-emerald-500'
            }`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl text-emerald-600 dark:text-emerald-400">{icon}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Payment Page Component
const PaymentPage = ({ 
  paymentMode, 
  setPaymentMode, 
  upiId, 
  setUpiId, 
  merchantName, 
  setMerchantName, 
  amount, 
  setAmount, 
  paymentMethod, 
  setPaymentMethod, 
  handleManualPayment, 
  handleQRPayment, 
  simulateQRScan, 
  videoRef, 
  canvasRef 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">New Payment</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Track expenses and detect leaks in real-time</p>
      </div>

      {/* Payment Mode Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setPaymentMode('manual')}
          className={`pb-3 font-medium text-lg transition-colors ${
            paymentMode === 'manual' 
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Manual Payment
        </button>
        <button
          onClick={() => setPaymentMode('qr')}
          className={`pb-3 font-medium text-lg transition-colors ${
            paymentMode === 'qr' 
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          QR Scan Payment
        </button>
      </div>

      {/* Manual Payment Form */}
      {paymentMode === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8"
        >
          <form onSubmit={handleManualPayment} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                UPI ID / Phone Number
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@bank or 9876543210"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Merchant Name
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="Enter merchant name"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="QR">QR Code</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg"
            >
              Initiate Payment
            </motion.button>
          </form>
        </motion.div>
      )}

      {/* QR Payment Section */}
      {paymentMode === 'qr' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Scan QR Code</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Point your camera at the merchant's QR code</p>
          </div>
          
          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 mb-6">
            {videoRef.current ? (
              <video 
                ref={videoRef} 
                className="w-full h-80 object-cover"
                playsInline 
                autoPlay 
              />
            ) : (
              <div className="w-full h-80 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Initializing camera...</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Merchant Name
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="Auto-filled after scan"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={simulateQRScan}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg flex items-center justify-center"
            >
              <span className="text-2xl mr-2">📷</span>
              Scan QR Code
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleQRPayment}
              disabled={!merchantName || !amount || parseFloat(amount) <= 0}
              className={`flex-1 font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg flex items-center justify-center ${
                !merchantName || !amount || parseFloat(amount) <= 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span className="text-2xl mr-2">✅</span>
              Confirm Payment
            </motion.button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> In a production environment, this would use a QR code decoding library to automatically extract merchant information. For this demo, clicking "Scan QR Code" will simulate a successful scan.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Processing Screen Component
const ProcessingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-md mx-auto text-center py-16"
    >
      <div className="w-24 h-24 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mx-auto mb-8"></div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Processing Payment</h2>
      <p className="text-gray-500 dark:text-gray-400">
        Please wait while we securely process your transaction...
      </p>
      <div className="mt-8 flex justify-center space-x-2">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          ></div>
        ))}
      </div>
    </motion.div>
  );
};

// Success Screen Component
const SuccessScreen = ({ transactionId, onBackToDashboard }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-md mx-auto text-center py-16"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-8">
        <span className="text-5xl text-emerald-600 dark:text-emerald-400">✓</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Payment Successful!</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Your transaction has been completed successfully.
      </p>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Transaction ID</p>
        <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300 break-all">
          {transactionId}
        </p>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBackToDashboard}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg"
      >
        Back to Dashboard
      </motion.button>
    </motion.div>
  );
};

export default App;
