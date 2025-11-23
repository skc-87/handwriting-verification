import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  LibraryBooks,
  ImportContacts,
  Schedule,
  ReceiptLong,
  TrendingUp,
  LocalLibrary
} from '@mui/icons-material';
import ManageBooks from '../components/ManageBooks';
import IssueReturnBooks from '../components/IssueReturnBooks';
import ViewBooks from '../components/ViewBooks';
import BookTransactions from '../components/BookTransactions';
import axios from 'axios';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const LibrarianDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch library statistics
  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem("authToken");
      
      if (!token) {
        setError('Please login again');
        return;
      }

      const API_BASE_URL = 'http://localhost:5000';
      const response = await axios.get(`${API_BASE_URL}/api/library/stats`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to load library statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card 
      sx={{ 
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: 'white',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1, fontSize: '0.9rem' }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {loading ? '--' : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <LocalLibrary sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}
          >
            Library Management System
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ opacity: 0.8 }}>
          Manage books, track transactions, and oversee library operations
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Books"
            value={stats.totalBooks}
            icon={<LibraryBooks sx={{ fontSize: 28, color: 'white' }} />}
            color="#667eea"
            subtitle="In collection"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Books Issued"
            value={stats.issuedBooks}
            icon={<ImportContacts sx={{ fontSize: 28, color: 'white' }} />}
            color="#f093fb"
            subtitle="Currently borrowed"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Overdue Books"
            value={stats.overdueBooks}
            icon={<Schedule sx={{ fontSize: 28, color: 'white' }} />}
            color="#f5576c"
            subtitle="Need attention"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions}
            icon={<ReceiptLong sx={{ fontSize: 28, color: 'white' }} />}
            color="#4facfe"
            subtitle="All time records"
          />
        </Grid>
      </Grid>

      {/* Quick Actions Bar */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a tab below to manage different library operations
          </Typography>
        </Box>
      </Paper>

      {/* Tabs Navigation */}
      <Paper 
        sx={{ 
          width: '100%', 
          mb: 2, 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 'bold',
              fontSize: '1rem',
              py: 2,
              minHeight: 'auto',
              '&.Mui-selected': {
                color: 'primary.main',
              }
            }
          }}
        >
          <Tab 
            icon={<LibraryBooks sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Browse Books" 
          />
          <Tab 
            icon={<ImportContacts sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Manage Books" 
          />
          <Tab 
            icon={<ReceiptLong sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Issue & Return" 
          />
          <Tab 
            icon={<Schedule sx={{ fontSize: 20, mr: 1 }} />} 
            iconPosition="start" 
            label="Transactions" 
          />
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      )}

      {/* Tab Content - Only show when not loading */}
      {!loading && (
        <>
          <TabPanel value={tabValue} index={0}>
            <ViewBooks onStatsUpdate={fetchStats} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <ManageBooks onStatsUpdate={fetchStats} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <IssueReturnBooks onStatsUpdate={fetchStats} />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <BookTransactions onStatsUpdate={fetchStats} />
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default LibrarianDashboard;