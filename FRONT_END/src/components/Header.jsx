import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Header.css';

const Header = () => {
    const { viewMode, setViewMode } = useAppContext();
    // Simple localization state
    const [isScrolled, setIsScrolled] = useState(false);

    // Translations
    const translations = {
        en: {
            department_name: 'Rajasthan Groundwater (Conservation & Management) Authority',
            govt_rajasthan: 'Government of Rajasthan'
        },
        hi: {
            department_name: 'राजस्थान भूजल (संरक्षण और प्रबंधन) प्राधिकरण',
            govt_rajasthan: 'राजस्थान सरकार'
        }
    };

    // Default to English as we removed the toggle
    const language = 'en';
    const t = (key) => translations[language][key] || key;

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsScrolled(prev => {
                if (!prev && scrollY > 100) return true;
                if (prev && scrollY < 15) return false;
                return prev;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`header-container ${isScrolled ? 'scrolled' : ''}`}>
            {/* Top Info Bar */}
            <div className="header-top-bar">
                <div className="container top-bar-content">

                    <div className="top-nav">
                        <a href="#about">About Us</a>
                        <a href="#contact">Contact Us</a>
                        <button className="login-btn">
                            <Icons.User size={14} />
                            Login
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className={`header-main ${isScrolled ? 'compact' : ''}`}>
                <div className="container main-content">
                    <div className="branding-section">
                        {/* Logo */}
                        <div className="logo-wrapper">
                            <img src="/logos/logo-black.png" alt="GWD Logo" className="logo-img" />
                        </div>
                        <div className="separator-line"></div>
                        <div className="title-wrapper">
                            <h1 className="department-name">
                                {t('department_name')}
                            </h1>
                            <p className="govt-name">
                                {t('govt_rajasthan')}
                            </p>
                        </div>
                    </div>

                    {/* Main Navigation Links */}
                    <nav className="main-nav">


                    </nav>

                    {/* Right Side Emblem */}
                    <div className="emblem-wrapper">
                        <img src="/logos/india-emblem.png" alt="Emblem of India" className="emblem-img" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
