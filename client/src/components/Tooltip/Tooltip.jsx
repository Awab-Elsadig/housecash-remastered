import React, { useState, useEffect, useRef } from 'react';
import classes from './Tooltip.module.css';

const Tooltip = ({ children, content, position = 'top', disabled = false }) => {
	const [isVisible, setIsVisible] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [actualPosition, setActualPosition] = useState(position);
	const timeoutRef = useRef(null);
	const tooltipRef = useRef(null);
	const containerRef = useRef(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const calculatePosition = () => {
		if (!tooltipRef.current || !containerRef.current) return position;

		const tooltip = tooltipRef.current;
		const container = containerRef.current;
		const rect = container.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		
		let newPosition = position;
		
		// Check if tooltip would go outside viewport
		if (position === 'top' && rect.top - tooltipRect.height < 0) {
			newPosition = 'bottom';
		} else if (position === 'bottom' && rect.bottom + tooltipRect.height > viewportHeight) {
			newPosition = 'top';
		} else if (position === 'left' && rect.left - tooltipRect.width < 0) {
			newPosition = 'right';
		} else if (position === 'right' && rect.right + tooltipRect.width > viewportWidth) {
			newPosition = 'left';
		}
		
		setActualPosition(newPosition);
	};

	const handleMouseEnter = () => {
		if (disabled || !content) return;
		
		timeoutRef.current = setTimeout(() => {
			setIsVisible(true);
			setShowTooltip(true);
			// Calculate position after tooltip is rendered
			setTimeout(calculatePosition, 0);
		}, 800); // 0.8 second delay
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setIsVisible(false);
		setTimeout(() => setShowTooltip(false), 150); // Delay hiding for smooth transition
	};

	const getTooltipPosition = () => {
		const positions = {
			top: classes.top,
			bottom: classes.bottom,
			left: classes.left,
			right: classes.right,
		};
		return positions[actualPosition] || classes.top;
	};

	return (
		<div 
			ref={containerRef}
			className={classes.tooltipContainer}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{showTooltip && (
				<div 
					ref={tooltipRef}
					className={`${classes.tooltip} ${getTooltipPosition()} ${isVisible ? classes.visible : ''}`}
				>
					{content}
				</div>
			)}
		</div>
	);
};

export default Tooltip;
