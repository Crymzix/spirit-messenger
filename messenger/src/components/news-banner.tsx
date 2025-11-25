import { useState, useEffect } from 'react';
import { useTopHeadlines } from '@/lib/hooks/news-hooks';
import { openUrl } from '@tauri-apps/plugin-opener';

export function NewsBanner() {
    const { headlines, isLoading } = useTopHeadlines();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const articles = headlines?.articles || [];
    const hasArticles = articles.length > 0;

    // Auto-cycle through articles every 5 seconds (unless hovered)
    useEffect(() => {
        if (!hasArticles || isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % articles.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [articles.length, isHovered, hasArticles]);

    const getCurrentArticle = () => {
        if (!hasArticles) return null;
        return articles[currentIndex % articles.length];
    };

    const openArticle = async (url: string) => {
        try {
            await openUrl(url);
        } catch (error) {
            console.error('Failed to open article:', error);
        }
    };

    const article = getCurrentArticle();

    if (isLoading) {
        return (
            <div
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
                className='h-[72px] w-full rounded-sm p-[2px] overflow-hidden'
            >
                <div className="flex items-center h-full justify-center justify-between">
                    <div
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        className='my-auto text-[#31497C] !text-lg'
                    >
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className='h-[72px] w-full rounded-sm p-[2px] overflow-hidden'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
                className='h-full w-full rounded-sm overflow-hidden'
            >
                {article && (
                    <div className='flex'>
                        <img
                            onClick={() => openArticle(article.url)}
                            src={article.urlToImage || '/msn-logo.png'} className='h-[70px] cursor-pointer'
                        />
                        <div className='flex flex-col gap-2 items-center justify-center p-4'>
                            <div
                                onClick={() => openArticle(article.url)}
                                title={article.title}
                                className='text-[#31497C] text-md font-bold line-clamp-1 cursor-pointer'
                            >
                                {article.title}
                            </div>
                            <div className="text-sm line-clamp-2">
                                {article.description}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
