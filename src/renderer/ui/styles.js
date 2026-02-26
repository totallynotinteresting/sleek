const coreStyle = document.createElement('style');
coreStyle.id = 'sleek-core-styles';
// sslack goes over our theme, so... ovverride it ig??
coreStyle.textContent = `
    .sleek-app.sleek-theme-active .sleek-bg-layer,
    .sleek-app.sleek-theme-active .p-theme_background,
    .sleek-app.sleek-theme-active .p-ia4_client,
    .sleek-app.sleek-theme-active .p-client_workspace,
    .sleek-app.sleek-theme-active .p-workspace__primary_view,
    .sleek-app.sleek-theme-active .p-workspace__primary_view_contents {
        background-color: transparent !important;
        background-image: none !important;
    }
    .sleek-app.sleek-theme-active {
        --sk_primary_background: transparent;
        --dt_color-base-primary: transparent;
    }`;
document.head.appendChild(coreStyle);
