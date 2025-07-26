import React from "react";
import classes from "./PageHeader.module.css";

const PageHeader = ({ title, subtitle, children }) => {
	return (
		<div className={classes.pageHeader}>
			<div className={classes.headerContent}>
				<h1 className={classes.title}>{title}</h1>
				{subtitle && <p className={classes.subtitle}>{subtitle}</p>}
			</div>
			{children && <div className={classes.headerActions}>{children}</div>}
		</div>
	);
};

export default PageHeader;
