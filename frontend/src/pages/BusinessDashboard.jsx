import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, BarChart2, Users, FileText, PlusCircle, ArrowRight, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { getUser } from '../utils/flowState';
import { getPosts } from '../utils/api';
import DashboardNavbar from '../components/DashboardNavbar';
import { Skeleton } from '../components/Skeleton';

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState([]);
  const user = useMemo(() => getUser() || {}, []);

  useEffect(() => {
    async function loadData() {
      try {
        const posts = await getPosts();
        // Filter only this business's posts
        const myPosts = posts.filter(p => p.authorId === user.id);
        setRecentPosts(myPosts.slice(0, 3));
      } catch (err) {
        console.error("Failed to load business posts", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  const stats = [
    { label: 'Total Reach', value: '12.4K', icon: <Users size={20} className="text-blue-600" />, change: '+14%' },
    { label: 'Active Promotions', value: '2', icon: <TrendingUp size={20} className="text-blue-600" />, change: 'Steady' },
    { label: 'Profile Views', value: '842', icon: <Activity size={20} className="text-blue-600" />, change: '+5%' },
    { label: 'Spend', value: '₹4,200', icon: <DollarSign size={20} className="text-blue-600" />, change: '-2%' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 text-[#0a0b0d] lg:px-10">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6">
        <DashboardNavbar activePath="/business-dashboard" />

        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user.companyName || user.name || 'Business'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Here's what's happening with your business today.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/create-post')}
              className="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FileText size={16} />
              New Post
            </button>
            <button
              onClick={() => navigate('/smart-promotion')}
              className="flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <PlusCircle size={16} />
              Create Promotion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-full bg-blue-50 p-2.5">
                  {stat.icon}
                </div>
                <span className={`text-xs font-semibold ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Updates</h2>
              <button onClick={() => navigate('/home')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View Feed <ArrowRight size={16} />
              </button>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div key={post.id} className="border border-gray-100 rounded-sm p-4 bg-gray-50/50">
                    <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>{post.likes} Likes</span>
                      <span>{post.comments.length} Comments</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-sm">
                <FileText size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-900">No posts yet</p>
                <p className="text-xs text-gray-500 mt-1">Share your first update with your network.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/opportunities')}
                  className="w-full flex items-center justify-between p-3 rounded-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase size={18} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Post a Job</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button 
                  onClick={() => navigate('/smart-promotion')}
                  className="w-full flex items-center justify-between p-3 rounded-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart2 size={18} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Ad Campaigns</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ChevronRight is needed locally
function ChevronRight(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="m9 18 6-6-6-6"/></svg>
}
