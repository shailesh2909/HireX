import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, CalendarDays, ChevronRight, ChevronLeft, Newspaper, Plus, Users, ShieldCheck, X } from 'lucide-react';
import { isBusinessRole } from '../utils/flowState';
import { getSponsoredPosts } from '../utils/promotionState';
import { getOpportunities } from '../utils/appData';
import { getPosts, likePost, commentPost } from '../utils/api';
import DashboardNavbar from '../components/DashboardNavbar';
import { PostSkeleton, Skeleton } from '../components/Skeleton';
import { useEffect } from 'react';
import { getUser } from '../utils/flowState';

function getInitials(name = 'Verified User') {
	return String(name)
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0] || '')
		.join('')
		.toUpperCase() || 'VU';
}

function FeedCard({ post, onLike, onComment, onConnect }) {
	const [showAllComments, setShowAllComments] = useState(false);
	const [commentText, setCommentText] = useState('');
	const [isImageOpen, setIsImageOpen] = useState(false);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const comments = Array.isArray(post?.comments) ? post.comments : [];
	const attachments = Array.isArray(post?.attachments) && post.attachments.length > 0 ? post.attachments : (post?.attachment ? [post.attachment] : []);
	const likes = Number.isFinite(post?.likes) ? post.likes : 0;

	function submitComment() {
		if (!commentText.trim()) {
			return;
		}
		onComment(post.id, commentText);
		setCommentText('');
		setShowAllComments(true);
	}

	const visibleComments = showAllComments ? comments : comments.slice(-2);

	return (
		<article className="rounded-sm border border-[rgba(91,97,110,0.14)] bg-white p-4 shadow-[0_10px_24px_rgba(10,11,13,0.05)]">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					{post?.authorPhoto ? (
						<img src={post.authorPhoto} alt={post.author} className="h-10 w-10 shrink-0 rounded-full border border-white object-cover shadow-sm" />
					) : (
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-semibold text-[#0052ff]">
							{getInitials(post?.author || 'Verified User')}
						</div>
					)}
					<div>
						<p className="text-[13px] font-semibold leading-none text-[#0a0b0d]">{post?.author || 'Verified User'}</p>
						<p className="mt-1 text-[11px] text-[#5b616e]">{post?.authorRole || 'Verified Professional'}</p>
						<p className="mt-1 text-[10px] text-[#8a909c]">{post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Just now'}</p>
					</div>
				</div>
				<span className="shrink-0 rounded-sm bg-[#eef0f3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a0b0d]">{post?.tag || 'Update'}</span>
			</div>
			<p
				className="mt-3 text-[14px] leading-[1.5] text-[#0a0b0d]"
				style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
			>
				{post?.content || ''}
			</p>

			{attachments.length > 0 && (
				<div className="relative mt-3">
					<img 
						src={attachments[currentImageIndex]} 
						alt="Post attachment" 
						onClick={() => setIsImageOpen(true)}
						className="w-full cursor-pointer rounded-sm object-cover transition-opacity hover:opacity-90" 
						style={{ maxHeight: 320 }} 
					/>
					{attachments.length > 1 && (
						<>
							<button 
								onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((i) => (i === 0 ? attachments.length - 1 : i - 1)); }}
								className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
							>
								<ChevronLeft size={20} />
							</button>
							<button 
								onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((i) => (i === attachments.length - 1 ? 0 : i + 1)); }}
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
							>
								<ChevronRight size={20} />
							</button>
							<div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white">
								{currentImageIndex + 1} / {attachments.length}
							</div>
						</>
					)}
					{isImageOpen && (
						<div 
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
							onClick={() => setIsImageOpen(false)}
						>
							<button 
								className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
								onClick={() => setIsImageOpen(false)}
							>
								<X size={24} />
							</button>
							{attachments.length > 1 && (
								<>
									<button 
										onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((i) => (i === 0 ? attachments.length - 1 : i - 1)); }}
										className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
									>
										<ChevronLeft size={32} />
									</button>
									<button 
										onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((i) => (i === attachments.length - 1 ? 0 : i + 1)); }}
										className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
									>
										<ChevronRight size={32} />
									</button>
								</>
							)}
							<img 
								src={attachments[currentImageIndex]} 
								alt="Post attachment expanded" 
								className="max-h-[90vh] max-w-full rounded-md object-contain shadow-2xl"
								onClick={(e) => e.stopPropagation()} 
							/>
							{attachments.length > 1 && (
								<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
									{attachments.map((_, idx) => (
										<div key={idx} className={`h-1.5 w-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}
			{post?.attachment && post.attachmentType === 'file' && (
				<a href={post.attachment} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-sm bg-[#eef0f3] px-3 py-2 text-xs font-semibold text-[#0052ff] hover:bg-[#e0e4eb]">
					📎 View Attachment
				</a>
			)}

			<div className="mt-3 grid gap-2 rounded-sm border border-[rgba(91,97,110,0.12)] bg-[#fafbfd] p-2.5 sm:grid-cols-3">
				<div>
					<p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a909c]">Likes</p>
					<p className="mt-1 text-[13px] font-semibold text-[#0a0b0d]">{likes}</p>
				</div>
				<div onClick={() => setShowAllComments(!showAllComments)} className="cursor-pointer hover:bg-[#f0f2f5] rounded-sm p-1 transition-colors">
					<p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a909c]">Comments</p>
					<p className="mt-1 text-[13px] font-semibold text-[#0a0b0d]">{comments.length}</p>
				</div>
				<div>
					<p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a909c]">Reach</p>
					<p className="mt-1 text-[13px] font-semibold text-[#0a0b0d]">{Math.max(50, likes * 12 + comments.length * 9)}</p>
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#5b616e]">
				<button type="button" onClick={() => onLike(post.id)} className="rounded-sm border border-[rgba(91,97,110,0.22)] px-3 py-1.5 transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">{post?.likedByMe ? 'Unlike' : 'Like'}</button>
				<button type="button" onClick={() => setShowAllComments(!showAllComments)} className={`rounded-sm border px-3 py-1.5 transition-colors ${showAllComments ? 'border-[#0052ff] text-[#0052ff] bg-[#0052ff]/5' : 'border-[rgba(91,97,110,0.22)] hover:border-[#0052ff] hover:text-[#0052ff]'}`}>Comment</button>
				<button type="button" onClick={onConnect} className="rounded-sm border border-[rgba(91,97,110,0.22)] px-3 py-1.5 transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Connect</button>
			</div>

			<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
				<input
					type="text"
					value={commentText}
					onChange={(event) => setCommentText(event.target.value)}
					placeholder="Write a comment"
					className="w-full rounded-sm border border-[rgba(91,97,110,0.22)] px-3.5 py-2 text-xs outline-none focus:border-[#0052ff]"
				/>
				<button type="button" onClick={submitComment} className="rounded-sm bg-[#0052ff] px-4 py-2 text-xs font-semibold text-white">Post</button>
			</div>
			{comments.length > 0 && (
				<div className="mt-2 space-y-1.5">
					{visibleComments.map((comment) => (
						<p key={comment.id} className="rounded-sm bg-[#f5f7fb] px-3 py-1.5 text-[11px] text-[#0a0b0d]"><span className="font-semibold">{comment.author}: </span>{comment.text}</p>
					))}
					{!showAllComments && comments.length > 2 && (
						<button 
							onClick={() => setShowAllComments(true)}
							className="text-[10px] font-bold text-[#0052ff] hover:underline px-1"
						>
							View all {comments.length} comments
						</button>
					)}
				</div>
			)}
		</article>
	);
}

function SponsoredFeedCard({ item }) {
	return (
		<article className="rounded-sm border border-[#0052ff]/22 bg-[#0052ff]/6 p-4 shadow-[0_8px_20px_rgba(10,11,13,0.04)]">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[13px] font-semibold text-[#0a0b0d]">Sponsored Post</p>
					<p className="text-[11px] text-[#5b616e]">Target: {item.audience}</p>
				</div>
				<span className="rounded-sm bg-[#0052ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Ad</span>
			</div>
			<p className="mt-2.5 text-[13px] leading-[1.45] text-[#0a0b0d]" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.content}</p>
			<p className="mt-2 text-[11px] text-[#5b616e]">Budget: Rs {item.budget} • Impressions: {item.impressions}</p>
		</article>
	);
}

export default function Home() {
	const navigate = useNavigate();
	const isBusiness = isBusinessRole();
	const [refreshKey, setRefreshKey] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [searchText, setSearchText] = useState('');

	const [feed, setFeed] = useState([]);
	const userProfile = useMemo(() => getUser() || {}, []);
	const [filterTag, setFilterTag] = useState('All');
	const [sortBy, setSortBy] = useState('recommended');
	const sponsoredPosts = getSponsoredPosts().filter((item) => item.status === 'active' && item.paymentStatus === 'paid');

	useEffect(() => {
		async function fetchFeed() {
			try {
				const data = await getPosts();
				setFeed(data);
			} catch (err) {
				console.error("Failed to load posts", err);
			} finally {
				setIsLoading(false);
			}
		}
		fetchFeed();
	}, [refreshKey]);

	const profile = useMemo(() => ({
		name: userProfile.name || 'Verified User',
		headline: userProfile.role === 'business' ? (userProfile.companyName || 'Verified Business') : 'Verified Professional',
		photoUrl: null, // Since we don't have user photos yet
		connectionsCount: 0,
		postsCount: 0,
		completion: 100
	}), [userProfile]);


	const opportunities = useMemo(() => getOpportunities().slice(0, 3), [refreshKey]);
	const rightPanelItems = sponsoredPosts.length > 0
		? sponsoredPosts.slice(0, 2)
		: opportunities.slice(0, 2);
	const profileViewers = Math.max(12, (profile.connectionsCount || 0) * 9 + (profile.postsCount || 0) * 4 + Math.round((profile.completion || 0) / 2));
	const postImpressions = Math.max(84, (profile.postsCount || 0) * 62 + Math.round((profile.completion || 0) * 3));

	const visibleFeed = useMemo(() => {
		const query = searchText.trim().toLowerCase();
		const filtered = feed.filter((post) => {
			const author = (post?.author || '').toLowerCase();
			const authorRole = (post?.authorRole || '').toLowerCase();
			const content = (post?.content || '').toLowerCase();
			const tag = (post?.tag || '').toLowerCase();
			const matchesQuery = query.length === 0
				|| author.includes(query)
				|| authorRole.includes(query)
				|| content.includes(query)
				|| tag.includes(query);
			const matchesTag = filterTag === 'All' || post?.tag === filterTag;
			return matchesQuery && matchesTag;
		});

		if (sortBy === 'newest') {
			return [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
		}

		if (sortBy === 'most-liked') {
			return [...filtered].sort((a, b) => (b.likes || 0) - (a.likes || 0));
		}

		return filtered;
	}, [feed, filterTag, searchText, sortBy]);

	function refresh() {
		setRefreshKey((value) => value + 1);
	}

	async function handleLike(postId) {
		try {
			await likePost(postId);
			refresh();
		} catch (err) {
			console.error("Failed to like post", err);
		}
	}

	async function handleComment(postId, text) {
		if (!text.trim()) return;
		try {
			await commentPost(postId, text);
			refresh();
		} catch (err) {
			console.error("Failed to add comment", err);
		}
	}

	function clearFeedFilters() {
		setSearchText('');
		setFilterTag('All');
		setSortBy('recommended');
	}

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 text-[#0a0b0d] lg:px-10">
			<div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6">
				<DashboardNavbar activePath="/home" />

				<div className="grid items-start gap-6 xl:grid-cols-[0.78fr_1.4fr_0.82fr]">
					<aside className="space-y-4 lg:sticky lg:top-6">
						<div className="overflow-hidden rounded-sm border border-[rgba(91,97,110,0.16)] bg-white shadow-[0_12px_28px_rgba(10,11,13,0.05)]">
							<div className="px-5 pt-5 pb-5">
								<div className="flex items-end gap-4">
									{isLoading ? (
										<Skeleton className="h-16 w-16 rounded-full border-4 border-white shadow-sm" />
									) : profile.photoUrl ? (
										<img src={profile.photoUrl} alt={profile.name} className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-[0_8px_20px_rgba(10,11,13,0.12)]" />
									) : (
										<div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#eef4ff] text-base font-semibold text-[#0052ff] shadow-[0_8px_20px_rgba(10,11,13,0.12)]">
											{getInitials(profile.name)}
										</div>
									)}
								</div>

								<div className="mt-4">
									<div className="flex items-center gap-2">
										{isLoading ? (
											<Skeleton className="h-6 w-32" />
										) : (
											<>
												<h2 className="text-[21px] font-semibold leading-none text-[#0a0b0d]">{profile.name}</h2>
												<span className="inline-flex items-center gap-1 rounded-sm bg-[#f3f8ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0052ff]">
													<ShieldCheck size={12} />
													Verified
												</span>
											</>
										)}
									</div>
									{isLoading ? (
										<div className="mt-2 space-y-2">
											<Skeleton className="h-4 w-48" />
											<Skeleton className="h-4 w-32" />
										</div>
									) : (
										<>
											<p className="mt-2 text-sm text-[#2a3141]">{profile.headline || (isBusiness ? 'Verified business profile' : 'Verified professional')}</p>
											<p className="mt-1 text-sm text-[#5b616e]">Pune City, Maharashtra</p>
											<p className="mt-2 text-sm font-medium text-[#0a0b0d]">{isBusiness ? 'Government Polytechnic Nagpur' : 'Building trust-led professional connections'}</p>
										</>
									)}
								</div>
							</div>
						</div>

						<div className="overflow-hidden rounded-sm border border-[rgba(91,97,110,0.16)] bg-white p-5 shadow-[0_12px_28px_rgba(10,11,13,0.05)]">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Premium</p>
							<p className="mt-2 text-lg font-semibold text-[#0a0b0d]">Job search smarter with Premium</p>
							<div className="mt-3 flex items-center gap-3 rounded-sm bg-[#f8fafc] px-4 py-3">
								<div className="h-7 w-7 rounded-sm bg-[#d6a23c]" />
								<div>
									<p className="text-sm font-medium text-[#0a0b0d]">Try 1 month for ₹0</p>
									<p className="text-xs text-[#5b616e]">See who viewed your profile and expand reach.</p>
								</div>
							</div>
						</div>

						<div className="overflow-hidden rounded-sm border border-[rgba(91,97,110,0.16)] bg-white p-5 shadow-[0_12px_28px_rgba(10,11,13,0.05)]">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Insights</p>
								<span className="rounded-sm bg-[#f3f8ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0052ff]">Live</span>
							</div>
							<div className="mt-4 space-y-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-[#0a0b0d]">Profile viewers</span>
									<span className="font-semibold text-[#0052ff]">{profileViewers}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-[#0a0b0d]">Post impressions</span>
									<span className="font-semibold text-[#0052ff]">{postImpressions}</span>
								</div>
							</div>
						</div>

						<div className="overflow-hidden rounded-sm border border-[rgba(91,97,110,0.16)] bg-white p-5 shadow-[0_12px_28px_rgba(10,11,13,0.05)]">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Saved shortcuts</p>
								<span className="rounded-sm bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Quick access</span>
							</div>
							<div className="mt-4 space-y-1.5">
								<button type="button" onClick={() => navigate('/profile')} className="group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-[#f8fafc]">
									<Bookmark size={16} className="text-[#0a0b0d]" />
									<span className="flex-1 text-sm font-medium text-[#0a0b0d]">Saved items</span>
									<ChevronRight size={14} className="text-[#8a909c] transition-transform group-hover:translate-x-0.5" />
								</button>
								<button type="button" onClick={() => navigate('/network')} className="group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-[#f8fafc]">
									<Users size={16} className="text-[#0a0b0d]" />
									<span className="flex-1 text-sm font-medium text-[#0a0b0d]">Groups</span>
									<ChevronRight size={14} className="text-[#8a909c] transition-transform group-hover:translate-x-0.5" />
								</button>
								<button type="button" onClick={() => navigate('/discover')} className="group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-[#f8fafc]">
									<Newspaper size={16} className="text-[#0a0b0d]" />
									<span className="flex-1 text-sm font-medium text-[#0a0b0d]">Newsletters</span>
									<ChevronRight size={14} className="text-[#8a909c] transition-transform group-hover:translate-x-0.5" />
								</button>
								<button type="button" onClick={() => navigate('/events')} className="group flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-[#f8fafc]">
									<CalendarDays size={16} className="text-[#0a0b0d]" />
									<span className="flex-1 text-sm font-medium text-[#0a0b0d]">Events</span>
									<ChevronRight size={14} className="text-[#8a909c] transition-transform group-hover:translate-x-0.5" />
								</button>
							</div>
						</div>
					</aside>

					<main className="space-y-4">
						<section className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-4 shadow-[0_8px_24px_rgba(10,11,110,0.05)]">
							<div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
								<input
									type="text"
									value={searchText}
									onChange={(event) => setSearchText(event.target.value)}
									placeholder="Search feed by author, role, topic"
									className="w-full rounded-sm border border-[rgba(91,97,110,0.22)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]"
								/>
								<select value={filterTag} onChange={(event) => setFilterTag(event.target.value)} className="w-full rounded-sm border border-[rgba(91,97,110,0.22)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0052ff]">
									<option value="All">All tags</option>
									<option value="Hiring">Hiring</option>
									<option value="Collab">Collab</option>
									<option value="Partnership">Partnership</option>
									<option value="Update">Update</option>
								</select>
								<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full rounded-sm border border-[rgba(91,97,110,0.22)] bg-white px-4 py-3 pr-9 text-sm outline-none focus:border-[#0052ff]">
									<option value="recommended">Top picks</option>
									<option value="newest">Newest</option>
									<option value="most-liked">Most liked</option>
								</select>
								<button type="button" onClick={clearFeedFilters} className="rounded-sm border border-[rgba(91,97,110,0.22)] px-5 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Reset</button>
							</div>
						</section>

						{isLoading ? (
							<>
								<PostSkeleton />
								<PostSkeleton />
								<PostSkeleton />
							</>
						) : (
							<>
								{sponsoredPosts.slice(0, 2).map((item) => (
									<SponsoredFeedCard key={item.id} item={item} />
								))}
								{visibleFeed.map((post) => (
									<FeedCard key={post.id} post={post} onLike={handleLike} onComment={handleComment} onConnect={() => navigate('/network')} />
								))}

								{visibleFeed.length === 0 && (
									<div className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
										<p className="text-lg font-semibold text-[#0a0b0d]">No feed posts found</p>
										<p className="mt-2 text-sm text-[#5b616e]">Try changing search or filter settings.</p>
										<button type="button" onClick={clearFeedFilters} className="mt-4 rounded-sm bg-[#0052ff] px-5 py-2.5 text-sm font-semibold text-white">Clear filters</button>
									</div>
								)}
							</>
						)}
					</main>

					<aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
						<div className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.04)]">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Promotions</p>
								<span className="rounded-sm bg-[#f3f8ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0052ff]">
									Live
								</span>
							</div>
							<div className="mt-3 space-y-3 text-sm">
								{rightPanelItems.map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => navigate(item.content ? '/smart-promotion' : '/opportunities')}
										className="w-full rounded-sm bg-[#f8fafc] p-3 text-left transition-colors hover:bg-[#eef4ff]"
									>
										<p className="font-semibold text-[#0a0b0d]">{item.content ? (item.audience || 'Sponsored promotion') : item.title}</p>
										<p className="text-[#5b616e]">{item.content ? item.content : `${item.company} • ${item.mode}`}</p>
									</button>
								))}
							</div>
						</div>
						<div className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-[#0a0b0d] p-5 text-white">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a6b3d1]">Trust insight</p>
							<p className="mt-2 text-lg font-semibold">Referrals perform 2.4x better when both sides are verified.</p>
							<p className="mt-2 text-sm text-white/72">Keep your profile complete to rank higher in verified search results.</p>
						</div>
					</aside>
				</div>
			</div>
		</div>
	);
}
