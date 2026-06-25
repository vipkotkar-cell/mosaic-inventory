// ============================================================
// SHELFWISE NEGATIVE IMPACT AUTO REPORT - v5
// NEW in v5:
// - Positive Movement tracking (Bad/QC/Recalled - Good)
// - Net Impact = Negative - Positive (per SKU, facility, biz type)
// - NI_Remarks sheet for dashboard remarks
// - doPost() to save remarks from dashboard
// - Pending remarks batched into morning email
// - Cancel-out logic: Bad-Good-Bad within 2 days nets to zero
// ============================================================
const NI_CONFIG = {
  DRY_RUN: false,               // set to true to suppress emails during testing
  SUBJECT_FILTER: 'Export Job Complete - Shelfwise Inventory',
  SEARCH_DAYS: 7,
  REPORT_TO: [
    'shashank.upadhyay@mosaicwellness.in',
    'vipul.kotkar@mosaicwellness.in',
    'shailendra@mosaicwellness.in',
    'asif.shaikh@mosaicwellness.in',
    'manish.khaladkar@mosaicwellness.in',
    'rupesh.shelar@mosaicwellness.in',
    'bhavesh.patel@mosaicwellness.in',
    'akshay.ahuja@mosaicwellness.in',
    'shraddha.raut@mosaicwellness.in',
    'snehit.darshanam@mosaicwellness.in',
    'ar@mosaicwellness.in',
    'sahil.madan@mosaicwellness.in',
  ],
  REMARK_ASSIGNEES: {
    'Self Warehouse':    { name: 'Bhavesh Patel',  email: 'bhavesh.patel@mosaicwellness.in' },
    '3PL B2C':          { name: 'Rupesh Shelar',  email: 'rupesh.shelar@mosaicwellness.in,shraddha.raut@mosaicwellness.in' },
    '3PL B2B':          { name: 'Rupesh Shelar',  email: 'rupesh.shelar@mosaicwellness.in,shraddha.raut@mosaicwellness.in' },
    'Dark Store':        { name: 'Akshay Ahuja',   email: 'akshay.ahuja@mosaicwellness.in' },
    'FBA / Marketplace': { name: 'Rupesh Shelar',  email: 'rupesh.shelar@mosaicwellness.in' },
  },
  BIZ_CONTACTS: {
    '3PL B2C':           'ops-b2c@mosaicwellness.in',
    '3PL B2B':           'ops-b2b@mosaicwellness.in',
    'Dark Store':         'darkstore@mosaicwellness.in',
    'Self Warehouse':    'warehouse@mosaicwellness.in',
    'FBA / Marketplace': 'fba@mosaicwellness.in',
  },
  DASHBOARD_URL:        'https://vipkotkar-cell.github.io/mosaic-inventory/',
  REPORT_HOUR:          8,
  REPORT_MINUTE:        0,
  TODAY_TARGET_HOUR:    7,
  YESTERDAY_TARGET_HOUR: 7,
  INTRO_START:          '2026-05-02',
  INTRO_END:            '2026-05-07',
  REMARK_MIN_COGS:      10000,
  SHEET_ID:             '186DE9ujZs7wuBwN1lseqCjI3kiIEM1DLEFLQbwjKzpM',
};
var BATCH_COGS_CACHE = {};
// loaded at runtime from COGS_Lookup sheet
var BRAND_FROM_GRN_ = {};
// loaded at runtime from COGS_Lookup sheet
var SKU_NAME_CACHE = {};
// loaded at runtime from SKU_Names sheet
var COGS_CACHE = {"MWBBNTP.2059.BO_N":22.62,"MWBWBCP.00166.B0_N":58.12,"MWBWBCP.00167.B0_N":189.07,"MWBWBCP.00168.B0_N":137.06,"MWBWBCP.00170.B0_N":106.53,"MWBWBCP.00188.BO_N":59.0,"MWBWHFFS.0033.B0_N":18.26,"MWBWHFFS.0038.B0_N":2.42,"MWBWHFFS.0039.B0_N":11.44,"MWBWHFFS.0040.B0_N":17.78,"MWBWHFFS.0041.B0_N":13.9,"MWBWHFFS.0044.B0_N":12.0,"MWBWHFK.00221.B0_N":77.82,"MWBWHFK.0089.B0_N":164.89,"MWBWHFP.00129.B0_N":1.0,"MWBWHFP.00145.B0_N":170.67,"MWBWHFP.00146.B0_N":45.08,"MWBWHFP.00159.B0_N":1.0,"MWBWHFP.00160.B0_N":120.7,"MWBWHFP.00161.B0_N":31.88,"MWBWHFP.00167.B0_N":96.89,"MWBWHFP.0017.B0_N":58.64,"MWBWHFP.00172.B0_N":63.81,"MWBWHFP.0018.B0_N":75.99,"MWBWHFP.00188.BO_N":186.06,"MWBWHFP.0019.B0_N":82.84,"MWBWHFP.0020.B0_N":75.95,"MWBWHFP.00204.B0_N":240.67,"MWBWHFP.0021.B0_N":85.34,"MWBWHFP.0022.B0_R":121.04,"MWBWHFP.00225.B0_N":91.0,"MWBWHFP.00229.B0_N":95.71,"MWBWHFP.00231.B0_N":146.9,"MWBWHFP.00310.B0_N":319.37,"MWBWHFP.00391.B0_N":89.29,"MWBWHFP.00397.B0_N":168.14,"MWBWHFP.00529.B0_N":70.87,"MWBWHFP.00531.B0_N":84.93,"MWBWHFP.00538.B0_N":61.45,"MWBWHFP.00541.B0_N":160.7,"MWBWHFP.00574.B0_N":58.76,"MWBWHFP.00575.B0_N":124.62,"MWBWHFP.0060.B0_N":167.85,"MWBWHFP.00609.B0_N":100.25,"MWBWHFP.00610.B0_N":99.77,"MWBWHFP.00616.B0_N":87.94,"MWBWHFP.00622.B0_N":159.86,"MWBWHFP.00623.B0_N":78.57,"MWBWHFP.00624.B0_N":89.13,"MWBWHFP.00625.B0_N":140.5,"MWBWHFP.00626.B0_N":183.21,"MWBWHFP.00635.B0_N":108.65,"MWBWHFP.00637.B0_N":50.84,"MWBWHFP.00644.B0_N":58.55,"MWBWHFP.00667.B0_N":176.25,"MWBWHFP.00672.B0_N":208.05,"MWBWHFP.00689.B0_N":33.8,"MWBWHFP.0070.B0_R":59.02,"MWBWHFP.00707.B0_N":113.74,"MWBWHFP.00711.B0_N":103.16,"MWBWHFP.0081.B0_N":170.83,"MWBWHFS.0017.B0_N":20.63,"MWBWHFS.0020.B0_N":75.18,"MWBWHFS.0021.B0_N":13.39,"MWBWHRP.0061.AAAA.B0_R":61.31,"MWBWICP.00334.B0_N":109.0,"MWBWICP.0079.B0_N":84.87,"MWBWICP.0080.B0_N":59.05,"MWBWICP.0084.B0_N":71.1,"MWBWICP.0085.B0_N":1.0,"MWBWICP.0087.B0_N":63.81,"MWBWNTP.00168.B0_N":172.57,"MWBWNTP.00339.B_N":80.45,"MWBWNTP.00341.B0_N":254.62,"MWBWNTP.00345.B0_N":161.23,"MWBWNTP.00347.B0_N":198.36,"MWBWNTP.00348.B0_N":389.87,"MWBWNTP.00349.B0_N":137.79,"MWBWNTP.00356.B0_N":284.05,"MWBWNTP.00357.B0_N":216.11,"MWBWOCP.00001.B0_N":229.69,"MWBWOCP.00002.B0_N":390.0,"MWBWOCP.00007.B0_N":56.28,"MWBWPCK.0001.B0_N":11.69,"MWBWPCK.0002.B0_N":5.9,"MWBWPCK.0003.B0_N":2.0,"MWBWPCK.0004.B0_N":1.38,"MWBWPCK.0005.B0_N":4.68,"MWBWPCK.0006.B0_N":13.1,"MWBWPCK.0007.B0_N":5.87,"MWBWPCP.00001.B0_N":587.38,"MWBWPCP.00134.B0_N":163.61,"MWBWPCP.00174.B0_N":187.09,"MWBWPCP.0066.B0_N":79.22,"MWBWPCP.0092.B0_N":89.16,"MWBWPCS.0035.B0_N":16.07,"MWBWPCS.0037.B0_N":10.96,"MWBWPCS.0038.B0_N":8.46,"MWBWPRP.00004.B0_N":212.59,"MWBWSKK.00201.B0_N":71.4,"MWBWSKK.00452.B0_N":81.9,"MWBWSKK.00453.B0_N":58.36,"MWBWSKK.0056.B0_N":20.86,"MWBWSKK.0057.B0_N":19.23,"MWBWSKK.0058.B0_N":23.4,"MWBWSKK.0059.B0_N":1.0,"MWBWSKK.00801.B0_N":216.8,"MWBWSKKC.00001.AAAA.B0_N":3.2,"MWBWSKP.0001.B0_N":54.1,"MWBWSKP.0002.B0_N":30.75,"MWBWSKP.0003.B0_N":54.79,"MWBWSKP.0004.B0_R":24.75,"MWBWSKP.0005.B0_N":11.62,"MWBWSKP.0006.B0_N":80.19,"MWBWSKP.0011.B0_N":1.0,"MWBWSKP.0012.B0_N":97.8,"MWBWSKP.0013.B0_N":148.19,"MWBWSKP.00132.B0_N":204.72,"MWBWSKP.00133.B0_N":200.52,"MWBWSKP.00143.B0_N":1.0,"MWBWSKP.00165.B0_N":70.35,"MWBWSKP.00169.B0_N":36.66,"MWBWSKP.00206.B0_N":45.43,"MWBWSKP.00214.B0_N":81.63,"MWBWSKP.00226.B0_N":327.19,"MWBWSKP.00240.B0_N":74.72,"MWBWSKP.00241.B0_N":67.41,"MWBWSKP.00265.B0_N":29.0,"MWBWSKP.00266.B0_N":1.0,"MWBWSKP.00328.B0_N":71.23,"MWBWSKP.00401.B0_N":77.52,"MWBWSKP.00418.B0_N":35.85,"MWBWSKP.00419.B0_N":75.55,"MWBWSKP.00427.B0_N":75.4,"MWBWSKP.00428.B0_N":61.53,"MWBWSKP.00436.B0_N":73.72,"MWBWSKP.00437.B0_N":39.91,"MWBWSKP.00468.B0_N":1.0,"MWBWSKP.00469.B0_N":1.0,"MWBWSKP.00504.B0_N":26.35,"MWBWSKP.00505.B0_N":113.95,"MWBWSKP.00506.B0_N":52.58,"MWBWSKP.00517.B0_N":1.0,"MWBWSKP.00518.B0_N":1.0,"MWBWSKP.00524.B0_N":1.0,"MWBWSKP.00525.B0_N":44.28,"MWBWSKP.00526.B0_N":36.73,"MWBWSKP.00532.B0_N":115.29,"MWBWSKP.00533.B0_N":69.49,"MWBWSKP.00536.B0_N":1.0,"MWBWSKP.00537.B0_N":49.58,"MWBWSKP.00538.B0_N":96.3,"MWBWSKP.00583.B0_N":73.43,"MWBWSKP.00584.B0_N":104.68,"MWBWSKP.00585.B0_N":75.31,"MWBWSKP.00586.B0_N":79.68,"MWBWSKP.00587.B0_N":51.28,"MWBWSKP.00589.B0_N":40.82,"MWBWSKP.00613.B7_N":144.92,"MWBWSKP.00614.B0_N":45.96,"MWBWSKP.00626.B0_N":28.17,"MWBWSKP.00627.B0_N":37.16,"MWBWSKP.00630.B0_N":98.0,"MWBWSKP.00646.B0_N":44.03,"MWBWSKP.00647.B0_N":77.8,"MWBWSKP.00648.B0_N":67.84,"MWBWSKP.00649.B0_N":144.47,"MWBWSKP.0065.B0_N":28.45,"MWBWSKP.00650.B0_N":72.23,"MWBWSKP.00651.B0_N":108.71,"MWBWSKP.00652.B0_N":96.49,"MWBWSKP.00653.B0_N":17.32,"MWBWSKP.00657.B0_N":97.76,"MWBWSKP.00659.B0_N":93.46,"MWBWSKP.00660.B0_N":28.04,"MWBWSKP.00661.B0_N":17.63,"MWBWSKP.00672.B0_N":103.17,"MWBWSKP.00676.B0_N":92.55,"MWBWSKP.00677.B0_N":141.28,"MWBWSKP.00680.B0_N":45.38,"MWBWSKP.00681.B0_N":37.61,"MWBWSKP.00683.B0_N":1245.32,"MWBWSKP.00684.B0_N":48.79,"MWBWSKP.00687.B0_N":56.08,"MWBWSKP.00690.B0_N":26.74,"MWBWSKP.00697.B0_N":117.95,"MWBWSKP.00703.B0_N":78.57,"MWBWSKP.00771.B0_N":98.03,"MWBWSKP.00777.B0_N":47.03,"MWBWSKP.00787.B0_N":49.0,"MWBWSKP.00788.B0_N":44.74,"MWBWSKP.00797.B0_N":115.52,"MWBWSKP.0083.B0_N":165.26,"MWBWSKP.0088.B0_N":12.84,"MWBWSKS.0005.B0_N":17.4,"MWBWSKS.0006.B0_N":11.8,"MWBWSKS.0036.B0_N":26.75,"MWBWSKS.0038.B0_N":1.0,"MWBWSKS.0040.B0_N":19.0,"MWBWSKS.0042.B0_N":6.15,"MWBWSKS.0045.B0_N":12.18,"MWBWSKS.0049.B0_N":17.23,"MWBWSKS.0050.B0_N":18.33,"MWBWSKS.0051.B0_N":13.82,"MWBWSKS.0052.B0_N":15.04,"MWBWSKS.0054.B0_N":26.66,"MWBWSKS.0059.B0_N":41.12,"MWBWSKS.0060.B0_N":26.81,"MWBWSKS.0061.B0_N":27.78,"MWBWSKS.0062.B0_N":28.08,"MWBWSKS.0064.B0_N":15.23,"MWBWSKS.0065.B0_N":20.21,"MWBWSKS.0066.B0_N":24.4,"MWBWSKS.0067.B0_N":40.47,"MWBWSKS.0070.B0_N":18.62,"MWBWSLP.00230.B0_N":122.55,"MWBWSLP.00420.B0_N":112.81,"MWBWUAEBCP.0001B0_N":45.24,"MWBWUAEBCP.0002B0_N":57.48,"MWBWUAEBCP.0003B0_N":47.25,"MWBWUAEBCP.0004B0_N":58.08,"MWBWUAEBCP.0005B0_N":51.01,"MWBWUAEBCP.0006B0_N":55.52,"MWBWUAEBCP.0007B0_N":56.92,"MWBWUAEBCP.0008B0_N":59.62,"MWBWUAEHFP.0001B0_N":116.7,"MWBWUAEHFP.0002B0_N":85.23,"MWBWUAENTP.0002B0_N":297.01,"MWBWUAENTP.0005B0_N":198.08,"MWBWUAENTP.0006B0_N":158.75,"MWBWUAENTP.0008B0_N":170.25,"MWBWUAENTP.0009B0_N":214.43,"MWBWUAEOCP.0001B0_N":46.0,"MWBWUAEOCP.0004B0_N":14.0,"MWBWUAEOCP.0005B0_N":28.0,"MWBWUAEOCP.0006B0_N":38.0,"MWBWUAEOCP.0007B0_N":19.0,"MWBWUAEOCP.0008B0_N":170.0,"MWBWUAESKP.0003B0_N":111.07,"MWBWUAESKP.0004B0_N":82.05,"MWBWUAESKP.0005B0_N":142.81,"MWBWUAESKP.0006B1_N":46.55,"MWBWUAESKP.0007B0_N":231.12,"MWBWUAESKP.0008B0_N":106.82,"MWBWUSAHFP.00001.B0_N":125.69,"MWBWUSAHFP.00002.B0_N":166.7,"MWBWUSAPR.00P.025_B0_N":220.95,"MWBWUSAPR.00P.026_B0_N":134.0,"MWBWUSAPR.00P.027_B0_N":241.5,"MWBWUSAPRP.00001.B0_N":171.58,"MWBWUSAPRP.00002.B0_N":172.62,"MWBWUSAPRP.00003.B0_N":219.05,"MWBWUSAPRP.00004.B0_N":201.36,"MWBWUSAPRP.00005.B0_N":357.0,"MWBWUSAPRP.00006.B0_N":267.0,"MWBWUSAPRP.00007.B0_N":227.16,"MWBWUSAPRP.00021.B0_N":201.36,"MWBWUSAPRP.00022.B0_N":412.29,"MWBWUTP.0067.B0_N":105.23,"MWBWUTP.0068.B0_N":260.09,"MWBWUTP.0073.B0_N":14.11,"MWBWWMP.00105.B0_N":302.44,"MWBWWMP.00122.B0_N":1.0,"MWBWWMP.00123.B0_N":168.08,"MWBWWMP.00147.B0_N":51.69,"MWBWWMP.00195.B0_N":125.89,"MWBWWMP.0027.B0_N":118.53,"MWBWWMP.0028.B0_N":92.78,"MWBWWMP.0082.B0_N":260.0,"MWBWWMP.0098.B0_N":41.89,"MWLJDCP.0001.B0_N":28.35,"MWLJDCP.00011.B0_N":37.9,"MWLJDCP.0002.B0_N":101.58,"MWLJDCP.0003.B0_N":58.73,"MWLJDCP.0007.B0_N":37.5,"MWLJDCS.0001.B0_N":8.55,"MWLJGCP.00010.B0_N":100.0,"MWLJGCP.0005.B0_N":2.75,"MWLJGCP.0006.B0_N":2.0,"MWLJGCP.0007.B0_N":14.0,"MWLJGCP.0008.B0_N":14.0,"MWLJGCP.0009.B0_N":110.0,"MWLJGNK.00077.B0_N":75.0,"MWLJGNP.0001.B0_N":260.0,"MWLJGNP.00011.B0_N":1.2,"MWLJGNP.00012.B0_N":1.0,"MWLJGNP.00016.B0_N":0.72,"MWLJGNP.0002.B0_N":152.0,"MWLJGNP.00021.B0_N":48.0,"MWLJGNP.00022.B0_N":4.32,"MWLJGNP.00023.B0_N":13.11,"MWLJGNP.00024.B0_N":13.21,"MWLJGNP.00025.B0_N":1.0,"MWLJGNP.00026.B0_N":12.96,"MWLJGNP.00027.B0_N":12.88,"MWLJGNP.00028.B0_N":12.98,"MWLJGNP.00029.B0_N":13.0,"MWLJGNP.0003.B0_N":30.01,"MWLJGNP.00030.B0_N":1.0,"MWLJGNP.00031.B0_N":1.05,"MWLJGNP.00040.B0_N":179.6,"MWLJGNP.00041.B0_N":399.6,"MWLJGNP.00045.B0_N":18.09,"MWLJGNP.00051.B0_N":60.0,"MWLJGNP.00052.B0_N":60.0,"MWLJGNP.00053.B0_N":60.0,"MWLJGNP.00056.B0_N":12.0,"MWLJGNP.00059.B0_N":55.0,"MWLJGNP.00068.B0_N":10.0,"MWLJGNP.00069.B0_N":67.0,"MWLJGNP.00071.B0_N":6.5,"MWLJGNP.0009.B0_N":49.67,"MWLJGNP.00531.BO_N":88.0,"MWLJHCP.0001.B0_N":121.99,"MWLJHYP.0001.B0_N":64.2,"MWLJHYP.0002.B0_N":70.0,"MWLJHYP.0003.B0_N":55.76,"MWLJHYP.0005.B0_N":70.0,"MWLJHYP.0006.B0_N":72.6,"MWLJHYP.0007.B0_N":74.0,"MWLJNTK.00101.B0_N":99.2,"MWLJNTK.00102.B0_N":287.57,"MWLJNTK.00104.B0_N":64.66,"MWLJNTK.00366.B0_N":13.32,"MWLJNTK.00367.B0_N":128.73,"MWLJNTK.00379.B0_N":14.26,"MWLJNTK.00470.B0_N":16.99,"MWLJNTK.00559.B0_N":97.01,"MWLJNTK.00611.B0_N":299.62,"MWLJNTK.00612.B0_N":466.36,"MWLJNTK.00613.B0_N":587.83,"MWLJNTKS.00046.B0_N":15.57,"MWLJNTP.0001.B0_N":109.36,"MWLJNTP.00017.B0_N":165.99,"MWLJNTP.00018.B0_N":53.0,"MWLJNTP.00019.B0_N":207.35,"MWLJNTP.0002.B0_N":96.99,"MWLJNTP.00023.B0_N":180.1,"MWLJNTP.00027.B0_N":137.58,"MWLJNTP.0003.B0_N":151.63,"MWLJNTP.00032.B0_N":282.29,"MWLJNTP.00033.B0_N":268.91,"MWLJNTP.00034.B0_N":158.26,"MWLJNTP.00037.B0_N":95.5,"MWLJNTP.0004.B0_N":90.46,"MWLJNTP.00040.B0_N":114.4,"MWLJNTP.00041.B0_N":68.74,"MWLJNTP.00042.B0_N":65.83,"MWLJNTP.00043.B0_N":106.25,"MWLJNTP.00051.B0_N":93.39,"MWLJNTP.00052.B0_N":67.2,"MWLJNTP.00056.B0_N":251.26,"MWLJNTP.00059.B0_N":172.88,"MWLJNTP.00060.B0_N":104.56,"MWLJNTP.00067.B0_N":132.36,"MWLJNTP.0007.B0_N":99.94,"MWLJNTP.000709.B0_N":319.44,"MWLJNTP.000748.B0_N":129.23,"MWLJNTP.000755.B0_N":106.08,"MWLJNTP.000759.B0_N":204.77,"MWLJNTP.000795.B0_N":60.38,"MWLJNTP.000796.B0_N":8.79,"MWLJNTP.0008.B0_N":60.0,"MWLJNTP.000801.B0_N":156.79,"MWLJNTP.000809.B0_N":135.7,"MWLJNTP.000810.B0_N":92.53,"MWLJNTP.000813.B0_N":166.37,"MWLJNTP.000814.B0_N":110.97,"MWLJNTP.000820.B0_N":55.69,"MWLJNTP.000836.B0_N":132.09,"MWLJNTP.00113.B0_N":42.0,"MWLJNTP.00122.B0_N":142.22,"MWLJNTP.00123.B0_N":2.35,"MWLJNTP.00124.B0_N":146.19,"MWLJNTP.00125.B0_N":69.7,"MWLJNTP.00126.B0_N":206.19,"MWLJNTP.00138.B_N":30.29,"MWLJNTP.00148.B0_N":15.0,"MWLJNTP.00153.B0_N":127.7,"MWLJNTP.00169.B0_N":317.48,"MWLJNTP.00177.B0_N":178.11,"MWLJNTP.00241.B0_N":94.7,"MWLJNTP.00248.B0_N":96.15,"MWLJNTP.00302.B0_N":129.3,"MWLJNTP.00339.B0_N":296.57,"MWLJNTP.00370.B0_N":64.03,"MWLJNTP.00372.B0_N":173.29,"MWLJNTP.00380.B0_N":94.3,"MWLJNTP.00381.B0_N":71.33,"MWLJNTP.00406.B0_N":125.86,"MWLJNTP.00407.B0_N":160.01,"MWLJNTP.00423.B0_N":163.56,"MWLJNTP.00480.B0_N":95.44,"MWLJNTP.00481.B0_N":41.83,"MWLJNTP.00482.B0_N":163.63,"MWLJNTP.00483.B0_N":165.74,"MWLJNTP.00484.B0_N":169.24,"MWLJNTP.00485.B0_N":169.53,"MWLJNTP.00500.B0_N":469.79,"MWLJNTP.00501.B0_N":37.16,"MWLJNTP.00507.B0_N":402.45,"MWLJNTP.00518.B0_N":151.44,"MWLJNTP.00519.B0_N":93.11,"MWLJNTP.00520.B0_N":109.21,"MWLJNTP.00527.BO_N":314.37,"MWLJNTP.00528.B0_N":192.78,"MWLJNTP.00529.B0_N":187.36,"MWLJNTP.00530.B0_N":174.34,"MWLJNTP.00531.B0_N":181.1,"MWLJNTP.00532.B0_N":178.07,"MWLJNTP.00533.B0_N":175.2,"MWLJNTP.00534.B0_N":166.76,"MWLJNTP.00535.B0_N":502.91,"MWLJNTP.00536.B0_N":52.54,"MWLJNTP.00541.BO_N":561.33,"MWLJNTP.00542.BO_N":96.7,"MWLJNTP.00548.B0_N":106.08,"MWLJNTP.00551.BO_N":76.9,"MWLJNTP.00553.BO_N":147.82,"MWLJNTP.00558.B0_N":194.34,"MWLJNTP.00560.B0_N":71.8,"MWLJNTP.00561.B0_N":192.01,"MWLJNTP.00562.B0_N":14.33,"MWLJNTP.00563.B0_N":13.69,"MWLJNTP.00571.B0_N":137.27,"MWLJNTP.00572.B0_N":77.53,"MWLJNTP.00574.BO_N":52.61,"MWLJNTP.00582.B0_N":135.5,"MWLJNTP.00584.BO_N":239.37,"MWLJNTP.00586.BO_N":87.06,"MWLJNTP.00588.B0_N":68.96,"MWLJNTP.00589.B0_N":46.57,"MWLJNTP.00591.B0_N":11.43,"MWLJNTP.00592.B0_N":9.96,"MWLJNTP.00603.BO_N":16.21,"MWLJNTP.00605.BO_N":13.15,"MWLJNTP.00607.BO_N":167.81,"MWLJNTP.00608.BO_N":428.57,"MWLJNTP.00609.BO_N":440.89,"MWLJNTP.00610.BO_N":160.01,"MWLJNTP.00615.BO_N":95.56,"MWLJNTP.00616.BO_N":107.26,"MWLJNTP.00617.BO_N":70.54,"MWLJNTP.00618.BO_N":49.61,"MWLJNTP.00636.B0_N":169.79,"MWLJNTP.00636.BO_N":138.52,"MWLJNTP.00662.BO_N":64.89,"MWLJNTP.00664.B0_N":87.5,"MWLJNTP.00667.B0_N":427.79,"MWLJNTP.00668.B0_N":387.77,"MWLJNTP.00676.B0_N":8.68,"MWLJNTP.00677.BO_N":2.75,"MWLJNTP.00678.B0_N":4.68,"MWLJNTP.00687.B0_N":304.3,"MWLJNTP.00690.BO_N":1.3,"MWLJNTP.00696.B0_N":151.75,"MWLJNTP.00697.B0_N":79.44,"MWLJNTP.00698.B0_N":163.15,"MWLJNTP.00699.B0_N":294.7,"MWLJNTP.00700.B0_N":315.51,"MWLJNTS.0001.B0_N":8.23,"MWLJNTS.00016.B0_N":12.39,"MWLJNTS.00017.B0_N":11.43,"MWLJNTS.00018.B0_N":13.79,"MWLJNTS.0002.B0_N":13.51,"MWLJNTS.00021.B0_N":14.25,"MWLJNTS.00022.B0_N":12.88,"MWLJNTS.0003.B0_N":17.36,"MWLJNTS.00031.B0_N":21.0,"MWLJNTS.00032.B0_N":9.45,"MWLJNTS.00034.B0_N":10.7,"MWLJNTS.00039.B0_N":11.33,"MWLJNTS.0004.B0_N":10.89,"MWLJNTS.00040.B0_N":15.44,"MWLJNTS.00041.B0_N":20.04,"MWLJNTS.00043.B0_N":12.98,"MWLJNTS.00056.B0_N":16.72,"MWLJNTS.00057.B0_N":16.53,"MWLJNTS.00058.B0_N":15.98,"MWLJNTS.00059.B0_N":15.64,"MWLJNTS.0006.BO_N":11.22,"MWLJNTS.00064.B0_N":20.14,"MWLJNTS.0007.B0_N":9.05,"MWLJNTS.0008.B0_N":11.14,"MWLJPCK.0001.B0_N":22.87,"MWLJPCK.0002.B0_N":9.19,"MWLJPCK.0003.B0_N":11.59,"MWLJPCK.0004.B0_N":1.5,"MWLJPCK.0005.B0_N":7.84,"MWLJPCK.0006.B0_N":33.13,"MWLJPCK.0007.B0_N":10.0,"MWLJPCK.0008.B0_N":15.5,"MWLJPCK.0009.B0_N":6.15,"MWLJPCP.0001.B0_N":111.17,"MWLJPCP.00010.B0_N":136.82,"MWLJPCP.00011.B0_N":135.0,"MWLJPCP.00016.B0_N":151.76,"MWLJPCP.00017.B0_N":120.0,"MWLJPCP.0003.B0_N":142.77,"MWLJPCP.0005.B0_N":105.41,"MWLJPCP.0006.B0_N":120.0,"MWLJPCP.0007.B0_N":132.31,"MWLJPCP.0008.B0_N":133.39,"MWLJPCP.0009.B0_N":135.0,"MWLJSKP.0001.B0_N":92.8,"MWLJSKP.0002.B0_N":62.68,"MWLJSKP.0003.B0_N":61.5,"MWLJSKP.0004.B0_N":55.13,"MWLJSKP.0005.B0_N":57.6,"MWLJSKP.0007.B0_N":62.75,"MWLJSKP.0008.B0_N":55.0,"MWLJSKP.0034.B0_N":96.03,"MWLJSKS.0001.B0_N":13.73,"MWLJUAEOC.0001.B0_N":4.0,"MWLJUAEOC.0002.B0_N":37.0,"MWLJUAEP.0001.B0_N":103.48,"MWLJUAEP.00010.B0_N":21.19,"MWLJUAEP.00016.B0_N":42.0,"MWLJUAEP.00018.B0_N":207.35,"MWLJUAEP.00019.B0_N":196.83,"MWLJUAEP.0002.B0_N":96.84,"MWLJUAEP.00020.B0_N":350.0,"MWLJUAEP.00021.B0_N":280.0,"MWLJUAEP.00022.B0_N":435.0,"MWLJUAEP.00023.B0_N":160.49,"MWLJUAEP.00025.B0_N":23.6,"MWLJUAEP.00026.B0_N":24.54,"MWLJUAEP.00027.B0_N":78.0,"MWLJUAEP.00028.B0_N":39.99,"MWLJUAEP.00029.B0_N":63.09,"MWLJUAEP.00030.B0_N":16.5,"MWLJUAEP.00031.B0_N":414.33,"MWLJUAEP.00032.B0_N":53.0,"MWLJUAEP.00033.B0_N":106.08,"MWLJUAEP.00035.B0_N":70.4,"MWLJUAEP.00036.B0_N":71.12,"MWLJUAEP.00037.B0_N":15.71,"MWLJUAEP.00039.B0_N":115.0,"MWLJUAEP.0004.B0_N":98.42,"MWLJUAEP.00040.B0_N":95.2,"MWLJUAEP.00041.B0_N":45.33,"MWLJUAEP.00042.B0_N":12.51,"MWLJUAEP.00043.B0_N":8.71,"MWLJUAEP.00044.B0_N":15.53,"MWLJUAEP.00045.B0_N":78.43,"MWLJUAEP.00047.B0_N":126.1,"MWLJUAEP.00049.B0_N":88.0,"MWLJUAEP.00051.B0_N":93.03,"MWLJUAEP.0006.B1_N":107.49,"MWLJUAEP.0007.B0_N":64.19,"MWLJUAEP.0008.B0_N":182.91,"MWLJUAEP.0009.B0_N":10.0,"MWLJUSANTP.00002.B0_N":87.88,"MWMMBDK.0280.AAAA.B0_N":60.0,"MWMMBDP.0001.AAAA.B0_N":45.16,"MWMMBDP.0002.AAAA.B0_N":25.82,"MWMMBDP.0003.AAAA.B0_N":70.21,"MWMMBDP.0004.AAAA.B0_N":98.75,"MWMMBDP.0005.AAAA.B0_N":68.76,"MWMMBDP.0006.AAAA.B0_N":90.17,"MWMMBDP.0085.AAAA.B0_R":75.41,"MWMMBDP.0128.AAAA.B0_R":97.87,"MWMMBDP.0132.AAAA.B0_R":65.35,"MWMMGCP.0005.AAAA.B0_N":0.55,"MWMMHKC.00001.AAAA.B0_N":1.5,"MWMMHKC.00002.AAAA.B0_N":1.0,"MWMMHRK.6520.AAAA.B0_N":74.79,"MWMMHRK.6856.B0_N":39.0,"MWMMHRP.0001.AAAA.B0_N":56.27,"MWMMHRP.0002.AAAA.B0_N":72.47,"MWMMHRP.0003.AAAA.B0_N":60.26,"MWMMHRP.0004.AAAA.B0_N":71.95,"MWMMHRP.0005.AAAA.B0_N":1.0,"MWMMHRP.0005.AAAA.B0_R":34.69,"MWMMHRP.0006.AAAA.B0_R":109.21,"MWMMHRP.0007.AAAA.B0_R":64.87,"MWMMHRP.0008.AAAA.B0_R":84.43,"MWMMHRP.0009.AAAA.B0_N":34.37,"MWMMHRP.0009.AAAA.B0_R":54.93,"MWMMHRP.0010.AAAA.B0_N":148.54,"MWMMHRP.0010.AAAA.B0_R":58.88,"MWMMHRP.0011.AAAA.B0_N":72.76,"MWMMHRP.0012.AAAA.B0_N":87.0,"MWMMHRP.0013.AAAA.B0_N":104.14,"MWMMHRP.0014.AAAA.B0_N":74.79,"MWMMHRP.0015.AAAA.B0_N":97.13,"MWMMHRP.0015.AAAA.B0_R":82.49,"MWMMHRP.0016.AAAA.B0_N":119.95,"MWMMHRP.0017.AAAA.B0_N":81.81,"MWMMHRP.0018.AAAA.B0_N":25.52,"MWMMHRP.0019.AAAA.B0_N":122.84,"MWMMHRP.0020.AAAA.B0_N":1.0,"MWMMHRP.0021.AAAA.B0_R":201.75,"MWMMHRP.0022.AAAA.B0_R":94.68,"MWMMHRP.1001.AAAA.B0_N":49.22,"MWMMHRP.1002.AAAA.B0_N":90.2,"MWMMHRP.1003.AAAA.B0_N":50.21,"MWMMHRP.2050.AAAA.B0_N":62.79,"MWMMHRP.2055.AAAA.B0_N":78.53,"MWMMHRP.6158.B0_N":137.31,"MWMMHRP.6171.AAAA.B0_N":1.0,"MWMMHRP.6190.AAAA.B0_N":213.16,"MWMMHRP.6198.AAAA.B0_N":76.81,"MWMMHRP.6200.AAAA.B0_N":73.4,"MWMMHRP.6286.AAAA.B0_N":61.0,"MWMMHRP.6298.AAAA.B0_N":122.41,"MWMMHRP.6337.AAAA.B0_N":26.91,"MWMMHRP.6450.AAAA.B0_N":101.97,"MWMMHRP.6474.AAAA.B0_N":128.33,"MWMMHRP.6483.AAAA.B0_N":82.28,"MWMMHRP.6533.AAAA.B0_R":1.0,"MWMMHRP.6622.B0_R":133.57,"MWMMHRP.6662.B0_N":1.0,"MWMMHRP.6663.B0_N":138.26,"MWMMHRP.6686.B0_R":89.0,"MWMMHRP.6770.B0_N":52.0,"MWMMHRP.7030.B0_N":130.47,"MWMMHRP.7031.B0_N":59.0,"MWMMHRP.7044.B0_N":118.49,"MWMMHRP.7106.B0_R":208.8,"MWMMHRP.7121.B0_R":150.0,"MWMMHRS.0001.AAAA.B0_N":13.07,"MWMMHRS.00013.AAAA.B0_N":16.2,"MWMMHRS.0002.AAAA.B0_N":21.9,"MWMMHRS.0003.AAAA.B0_N":19.87,"MWMMHRS.0004.AAAA.B0_N":11.1,"MWMMHRS.0007.AAAA.B0_N":19.31,"MWMMHRS.0008.AAAA.B0_N":1.0,"MWMMHRS.0009.AAAA.B0_N":11.78,"MWMMHRS.0010.AAAA.B0_N":20.91,"MWMMHRS.0011.AAAA.B0_N":11.44,"MWMMHRS.0012.AAAA.B0_N":17.17,"MWMMHRS.0013.AAAA.B0_N":3.51,"MWMMHRS.0014.AAAA.B0_N":3.9,"MWMMHRS.0015.AAAA.B0_N":7.61,"MWMMHRS.0016.AAAA.B0_N":4.0,"MWMMHRS.0017.AAAA.B0_N":11.23,"MWMMHRS.0018.AAAA.B0_N":16.49,"MWMMHRS.0019.AAAA.B0_N":10.49,"MWMMHRS.0020.AAAA.B0_N":11.02,"MWMMHTP.0001.AAAA.B0_N":48.29,"MWMMHTP.0002.AAAA.B0_N":57.5,"MWMMHTP.0003.AAAA.B0_N":47.47,"MWMMHTP.0004.AAAA.B0_N":52.78,"MWMMHTP.0005.AAAA.B0_N":13.51,"MWMMHTP.0006.AAAA.B0_N":1.0,"MWMMHTP.0007.AAAA.B0_N":42.95,"MWMMHTP.0127.AAAA.B0_N":70.0,"MWMMHTP.1001.AAAA.B0_N":1.0,"MWMMHTP.1002.AAAA.B0_N":50.92,"MWMMHTP.1003.AAAA.B0_N":45.5,"MWMMHTP.1004.AAAA.B0_N":45.5,"MWMMHTP.1005.AAAA.B0_N":117.75,"MWMMHTP.1006.AAAA.B0_N":89.71,"MWMMHTP.1007.AAAA.B0_N":45.5,"MWMMHTP.1008.AAAA.B0_N":45.5,"MWMMHTP.1009.AAAA.B0_N":45.5,"MWMMHTP.1010.AAAA.B0_N":131.5,"MWMMHTP.1011.AAAA.B0_N":65.5,"MWMMHTP.1012.AAAA.B0_N":1.0,"MWMMHTP.1013.AAAA.B0_N":117.0,"MWMMHTP.1014.AAAA.B0_N":119.92,"MWMMHTP.1015.AAAA.B0_N":123.64,"MWMMHTP.1016.AAAA.B0_N":113.9,"MWMMHTP.1017.AAAA.B0_N":118.65,"MWMMHTP.1018.AAAA.B0_N":45.5,"MWMMHTP.1019.AAAA.B0_N":123.74,"MWMMHTP.1020.AAAA.B0_N":123.77,"MWMMHTP.1021.AAAA.B0_N":45.51,"MWMMHTP.1022.AAAA.B0_N":1.0,"MWMMHTP.1023.AAAA.B0_N":119.02,"MWMMHTP.1024.AAAA.B0_N":99.57,"MWMMHTS.1001.AAAA.B0_N":9.0,"MWMMHTS.1002.AAAA.B0_N":19.62,"MWMMHTS.1003.AAAA.B0_N":14.14,"MWMMHYKC.00001.AAAA.B0_N":2.11,"MWMMIMP.0001.AAAA.B0_N":119.0,"MWMMNSK.0005.B1_R":134.88,"MWMMNSP.0006.B0_R":1.0,"MWMMNSP.0009.B0_N":1.0,"MWMMNTK.0059.AAAA.B0_N":1.0,"MWMMNTK.0100.AAAA.B0_N":474.86,"MWMMNTK.0129.AAAA.B0_N":188.41,"MWMMNTK.0141.AAAA.B0_N":709.6,"MWMMNTP.0001.AAAA.B0_N":47.26,"MWMMNTP.000172.AAAAB0_N":272.34,"MWMMNTP.000174.AAAAB0_N":430.05,"MWMMNTP.000176.AAAAB0_N":453.45,"MWMMNTP.000186.AAAAB0_N":567.26,"MWMMNTP.000187.AAAAB0_N":527.74,"MWMMNTP.000191.AAAAB0_N":118.75,"MWMMNTP.0002.AAAA.B0_N":363.68,"MWMMNTP.0003.AAAA.B0_N":214.81,"MWMMNTP.0004.AAAA.B0_N":171.48,"MWMMNTP.0005.AAAA.B0_N":204.63,"MWMMNTP.0012.AAAA.B0_N":198.21,"MWMMNTP.0013.AAAA.B0_N":75.21,"MWMMNTP.0014.AAAA.B0_N":165.88,"MWMMNTP.0019.AAAA.B0_N":139.07,"MWMMNTP.00205.AAAA.B0_N":124.49,"MWMMNTP.00207.AAAA.B0_N":231.49,"MWMMNTP.00208.AAAA.B0_N":305.09,"MWMMNTP.00210.AAAA.B0_N":1096.0,"MWMMNTP.00211.AAAA.B0_N":185.0,"MWMMNTP.0035.AAAABO_N":197.22,"MWMMNTP.0038.AAAA.B0_N":1031.3,"MWMMNTP.0040.AAAA.B0_N":107.0,"MWMMNTP.0041.AAAA.B0_N":680.76,"MWMMNTP.0047.AAAA.B0_N":266.05,"MWMMNTP.0055.AAAA.B0_N":58.17,"MWMMNTP.0072.AAAA.B0_N":217.28,"MWMMNTP.0073.AAAA.B0_N":148.81,"MWMMNTP.0104.AAAA.B0_N":145.96,"MWMMNTP.0105.AAAA.B0_N":61.16,"MWMMNTP.0109.AAAA.B0_N":387.4,"MWMMNTP.0110.AAAA.B0_N":49.86,"MWMMNTP.0112.AAAA.B0_N":80.45,"MWMMNTP.0127.AAAA.B0_N":158.03,"MWMMNTP.0147.AAAA.B0_N":18.18,"MWMMNTP.0148.AAAA.B0_N":15.45,"MWMMNTP.0149.AAAA.B0_N":77.48,"MWMMNTP.0150.AAAA.B0_N":769.64,"MWMMNTP.0151.AAAA.B0_N":50.64,"MWMMNTP.0169.AAAA.B0_N":253.6,"MWMMNTP.0170.AAAA.B0_N":1106.0,"MWMMNTP.0171.AAAA.B0_N":211.12,"MWMMNTP.6345.AAAABO_N":109.8,"MWMMNTP.6346.AAAABO_N":95.03,"MWMMNTP.6348.AAAABO_N":186.97,"MWMMNTP.6349.AAAABO_N":216.0,"MWMMNTP.6356.AAAABO_N":194.63,"MWMMNTP.6369.AAAABO_N":140.07,"MWMMNTS.0001.AAAA.B0_N":29.8,"MWMMNTS.0032.AAAA.B0_N":37.62,"MWMMNTS.0033.AAAA.B0_N":10.84,"MWMMNTS.0034.AAAA.B0_N":65.39,"MWMMNTS.0035.AAAA.B0_N":32.33,"MWMMNTS.0036.AAAA.B0_N":32.3,"MWMMNTS.0037.AAAA.B0_N":8.76,"MWMMNTS.0038.AAAA.B0_N":6.2,"MWMMNTS.0043.AAAA.B0_N":6.15,"MWMMOCP.0001.B0_N":228.91,"MWMMOCP.0002.B0_N":387.64,"MWMMOCP.0003.B0_N":37.34,"MWMMOCP.0004.B0_N":110.72,"MWMMOCP.0005.B0_N":112.14,"MWMMOCP.0006.B0_N":406.1,"MWMMOCP.0019.B0_N":6.15,"MWMMOCP.0029.B0_N":600.0,"MWMMPCK.0001.AAAA.B0_N":11.2,"MWMMPCK.0002.AAAA.B0_N":10.29,"MWMMPCK.0003.AAAA.B0_N":10.52,"MWMMPCK.0004.AAAA.B0_N":4.6,"MWMMPCK.0005.AAAA.B0_N":2.35,"MWMMPCK.0006.AAAA.B0_N":3.3,"MWMMPCK.0007.AAAA.B0_N":1.1,"MWMMPCK.0008.AAAA.B0_N":1.36,"MWMMPCK.0009.AAAA.B0_N":4.16,"MWMMPCK.0010.AAAA.B0_N":29.4,"MWMMPCK.0013.AAAA.B0_N":5.76,"MWMMPCK.0015.AAAA.B0_N":4.16,"MWMMPCK.0016.AAAA.B0_N":5.04,"MWMMPCK.0017.AAAA.B0_N":3.75,"MWMMPCK.0018.AAAA.B0_N":5.15,"MWMMPKC.00001.AAAA.B0_N":1.57,"MWMMPRK.2026.AAAA.B0_N":90.54,"MWMMPRK.2097.B0_N":202.82,"MWMMPRP.0007.AAAA.B0_R":6.2,"MWMMPRP.0008.AAAA.B0_R":9.67,"MWMMPRP.0009.AAAA.B0_N":29.0,"MWMMPRP.0010.AAAA.B0_N":101.37,"MWMMPRP.0040.AAAA.B0_N":62.0,"MWMMPRP.0041.AAAA.B0_N":57.5,"MWMMPRP.1001.AAAA.B0_N":92.78,"MWMMPRP.2016.AAAA.B0_N":24.0,"MWMMPRP.2017.AAAA.B0_N":1.0,"MWMMPRP.2018.AAAA.B0_N":1.0,"MWMMPRP.2019.AAAA.B0_N":86.8,"MWMMPRP.2020.AAAA.B0_N":166.08,"MWMMPRP.2021.AAAA.B0_N":50.48,"MWMMPRP.2022.AAAA.B0_N":61.22,"MWMMPRP.2032.AAAA.B0_N":29.0,"MWMMPRP.2034.AAAA.B0_N":128.32,"MWMMPRP.2040.AAAA.B0_N":28.14,"MWMMPRP.2041.AAAA.B0_N":28.17,"MWMMPRP.2045.AAAA.B0_N":54.58,"MWMMPRP.2090.B0_N":80.14,"MWMMPRP.2091.B0_N":71.85,"MWMMPRP.2092.B0_N":108.92,"MWMMPRP.5002.AAAA.B0_N":200.0,"MWMMPRS.1001.AAAA.B0_N":9.1,"MWMMPRS.1002.AAAA.B0_N":17.5,"MWMMSKC.00001.AAAA.B0_N":1.81,"MWMMSKKC.00001.AAAA.B0_N":1.81,"MWMMSKP.5001.AAAA.B0_N":138.44,"MWMMSKP.5002.AAAA.B0_N":56.7,"MWMMSKP.5003.AAAA.B0_N":51.98,"MWMMSKP.5004.AAAA.B0_N":74.06,"MWMMSKP.5005.AAAA.B0_N":30.72,"MWMMSKP.5006.AAAA.B0_N":1.0,"MWMMSKP.5007.AAAA.B0_N":1.0,"MWMMSKP.5008.AAAA.B0_N":155.9,"MWMMSKP.5009.AAAA.B0_N":59.28,"MWMMSKP.5010.AAAA.B0_N":117.56,"MWMMSKP.5011.AAAA.B0_N":1.0,"MWMMSKP.5012.AAAA.B0_N":41.08,"MWMMSKP.5049.AAAA.B0_N":44.15,"MWMMSKP.5059.AAAA.B0_N":78.27,"MWMMSKP.5061.AAAA.B0_N":79.48,"MWMMSKP.5063.AAAA.B0_N":108.97,"MWMMSKS.5002.AAAA.B0_N":27.77,"MWMMSKS.5003.AAAA.B0_N":16.04,"MWMMSLP.0001.B0_N":67.68,"MWMMSMP.4001.AAAA.B0_N":117.15,"MWMMSMP.4002.AAAA.B0_N":35.12,"MWMMSMP.4003.AAAA.B0_N":115.14,"MWMMSMP.4004.AAAA.B0_N":90.07,"MWMMSMP.4005.AAAA.B0_N":113.24,"MWMMWKC.00001.AAAA.B0_N":1.82,"MWMMWTP.0001.AAAA.B0_N":95.48,"MWMMWTP.1001.AAAA.B0_N":75.74,"MWMMWTP.1002.AAAA.B0_N":107.42,"MWMMWTP.1003.AAAA.B0_N":196.74,"MWMMWTP.1004.AAAA.B0_N":114.64,"MWRLUSAPRK.00001.B0_N":229.65,"MWRLUSAPRK.00003.B0_N":220.72,"MWRLUSAPRK.00004.B0_N":215.67,"MWRLUSAPRK.00005.B0_N":240.62,"MWRLUSAPRK.00006.B0_N":437.61,"MWRLUSAPRP.00007.B0_N":403.93,"MWRLUSAPRP.00010.B0_N":290.65,"MWRLUSAPRP.00013.B0_N":239.35,"MWRLUSAPRP.00014.B0_N":441.89,"MWRLUSAPRP.00021.B0_N":345.34,"MWSBP.0007.AAAA.B0_N":698.0,"MWSSUSAPRK.00001.B0_N":212.77,"MWSSUSAPRP.00010.B0_N":341.23,"MWSSUSAPRP.0008.B0_N":331.02,"OWNAPP.0001":916.49,"OWNAPP.00010":0.47,"OWNAPP.00011":1.65,"OWNAPP.00012":1574.93,"OWNAPP.00013":244.0,"OWNAPP.00015":1782.95,"OWNAPP.00016":6.25,"OWNAPP.00017":3.13,"OWNAPP.00018":655.88,"OWNAPP.00019":1581.66,"OWNAPP.0002":13.33,"OWNAPP.00020":1363.44,"OWNAPP.00021":314.5,"OWNAPP.00023":4.76,"OWNAPP.00024":5.5,"OWNAPP.00025":0.61,"OWNAPP.00026":24.76,"OWNAPP.00027":0.75,"OWNAPP.00028":2.13,"OWNAPP.0003":15.24,"OWNAPP.00032":0.6,"OWNAPP.00035":4.3,"OWNAPP.00036":0.6,"OWNAPP.00037":4.3,"OWNAPP.0004":5.5,"OWNAPP.0005":0.51,"OWNAPP.0006":0.51,"OWNAPP.0007":5.2,"OWNAPP.0009":4.35,"POBUAEBB1":24.5,"POBUAELJ1":38.5,"POBUAELJ10":10.0,"POBUAELJ11":10.0,"POBUAELJ12":10.0,"POBUAELJ13":56.0,"POBUAELJ14":30.5,"POBUAELJ15":10.0,"POBUAELJ16":10.0,"POBUAELJ17":10.0,"POBUAELJ2":39.5,"POBUAELJ3":15.52,"POBUAELJ4":15.52,"POBUAELJ5":15.52,"POBUAELJ6":40.0,"POBUAELJ7":15.0,"POBUAELJ8":39.5,"POBUAELJ9":40.0,"Sample_Bebodywise":1.0,"Sample_Littlejoys":1.0,"Sample_Manmatters":1.0};
// ============================================================
// MAIN
// ============================================================
function runDailyNegativeImpactReport() {
try {
// ── TIMING GATE: ensure we run at 7:50 AM IST ──────────────────────────
// GAS triggers fire anywhere in the 7:00-8:00 window.
// If we're before 7:50 AM, schedule a one-time run at exactly 7:50 AM and exit.
// This guarantees the 7:45 AM Shelfwise email has arrived before we process.
const _nowIST = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
const _hIST = _nowIST.getHours(), _mIST = _nowIST.getMinutes();
const TARGET_HOUR = 7, TARGET_MIN = 50;
if (_hIST < TARGET_HOUR || (_hIST === TARGET_HOUR && _mIST < TARGET_MIN)) {
  const _delayMs = ((TARGET_HOUR * 60 + TARGET_MIN) - (_hIST * 60 + _mIST)) * 60 * 1000;
  Logger.log('Before 7:50 AM IST (' + _hIST + ':' + (_mIST<10?'0':'')+_mIST + ') — scheduling run in ' + Math.round(_delayMs/60000) + ' min');
  ScriptApp.newTrigger('runDailyNegativeImpactReport').timeBased().after(_delayMs).create();
  return;
}
// ──────────────────────────────────────────────────────────────────────────
Logger.log('=== Negative Impact Report v5: START ===');
// -- Month transition: creates new sheet if month has changed
try {
autoTransitionMonth();
} catch(e) {
Logger.log('autoTransitionMonth_ failed (non-fatal): ' + e);
}
// -- Load batch-level COGS + brand data from COGS_Lookup sheet
try {
loadCOGSLookup_();
} catch(e) {
Logger.log('loadCOGSLookup_ failed (non-fatal): ' + e);
}
// -- Load SKU-Name master for name fallback
try {
loadSKUNames_();
} catch(e) {
Logger.log('loadSKUNames_ failed (non-fatal): ' + e);
}
// -- Auto-archive on 1st of every month (runs before today's report) --
const nowIST = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
if (nowIST.getDate() === 1) {
Logger.log('1st of month detected — running auto-archive...');
try {
archiveMonthlyData();
Logger.log('Auto-archive complete.');
} catch(archErr) {
Logger.log('Auto-archive failed (non-fatal): ' + archErr.message);
}
}
const exports = getLastTwoExports_();
if (!exports) {
  if (NI_CONFIG.DRY_RUN) { Logger.log('[DRY_RUN] Would send SKIP email — no Shelfwise exports found'); } else { MailApp.sendEmail({to: 'vipul.kotkar@mosaicwellness.in', bcc: NI_CONFIG.REPORT_TO.join(','), subject: 'Negative Impact Report — Skipped', body: 'Could not find two Shelfwise exports.', name: 'Inventory Health Monitor'}); }
  return;
} Logger.log('Today: ' + exports.today.dateStr + ' | Yesterday: ' + exports.yesterday.dateStr);
const todayData = fetchCSV_(exports.today.url);
const yesterdayData = fetchCSV_(exports.yesterday.url);
Logger.log('Rows — Today: ' + todayData.length + ' | Yesterday: ' + yesterdayData.length);
if (!todayData.length || !yesterdayData.length) {
Logger.log('Empty data. Aborting.');
return;
}
// Run analysis first
const result = analyzeImpact_(yesterdayData, todayData, exports.today.date, exports.yesterday.date);
// Save analysis results to sheet (small tables, completes in seconds)
Logger.log('Saving analysis results to sheets...');
saveResultsToSheet_(result, todayData);
Logger.log('Sheets saved. Dashboard current.');
Logger.log('Neg events: ' + result.totEv + ' | Pos events: ' + result.posEv);
Logger.log('Gross neg: ' + fmtV_(result.totVal) + ' | Recovery: ' + fmtV_(result.posVal) + ' | Net: ' + fmtV_(result.netVal));
// Append to history
appendHistory_(result);
// Log Top 10 neg events to permanent history
appendEventHistory_(result, result.todayStr);
appendFacHistory_(result);
appendDailyPNL_(result);
// Load WTD/MTD + pending remarks
const wtdMtd = getWtdMtd_();
const pendingRemarks = getPendingRemarks_();
sendEmail_(result, wtdMtd, pendingRemarks);
// Send month-end summary if today is the last day of the month
if (isLastDayOfMonth_()) {
sendMonthEndEmail_();
} Logger.log('=== Negative Impact Report v5: DONE ===');
} catch(e) {
Logger.log('ERROR: ' + e.message + '\ ' + e.stack);
if (NI_CONFIG.DRY_RUN) { Logger.log('[DRY_RUN] Would send ERROR email: ' + e.message); } else { MailApp.sendEmail({to: 'vipul.kotkar@mosaicwellness.in', bcc: NI_CONFIG.REPORT_TO.join(','), subject: 'ERROR — Negative Impact Report Failed', body: e.message + '\ \ ' + e.stack, name: 'Inventory Health Monitor'}); }
}
}
// ============================================================
// GMAIL: PICK EXPORT CLOSEST TO 9 AM
// ============================================================
function getLastTwoExports_() {
const threads = GmailApp.search(NI_CONFIG.SUBJECT_FILTER + ' newer_than:' + NI_CONFIG.SEARCH_DAYS + 'd', 0, 30);
if (!threads || !threads.length)
return null;
const found = [];
for (const thread of threads) {
for (const msg of thread.getMessages()) {
const body = msg.getPlainBody() + msg.getBody();
const m = body.match(/https:\/\/[a-zA-Z0-9\-\.]+\.cloudfront\.net\/[^\s"<>\n]+\.csv/i);
if (!m) continue;
const d = msg.getDate();
found.push({
url:m[0].trim(), date:d, dateStr: Utilities.formatDate(d,'Asia/Kolkata','dd MMM yyyy HH:mm'), dayKey: Utilities.formatDate(d,'Asia/Kolkata','yyyy-MM-dd'), hourIST: parseInt(Utilities.formatDate(d,'Asia/Kolkata','HH'),10)
});
}
}
if (!found.length)
return null;
const seen={}, unique=[];
found.sort((a,b)=>a.date-b.date);
found.forEach(f=>{
if(!seen[f.url]){seen[f.url]=true;unique.push(f);}
});
const byDay={};
unique.forEach(f=>{
// Reject emails at 8:00 AM or later — the 8:10 AM Shelfwise export is incorrect
if (f.hourIST >= 8) { Logger.log('getLastTwoExports_: skipping ' + f.dateStr + ' (hourIST=' + f.hourIST + ', >= 8 AM)'); return; }
if(!byDay[f.dayKey]) byDay[f.dayKey]=[];
byDay[f.dayKey].push(f);
});
// Sort days newest - oldest
const daysAll = Object.keys(byDay).sort().reverse();
if (daysAll.length < 2) {
Logger.log('Need 2 days with pre-8AM exports, found: ' + daysAll.length);
return null;
}
// Check if the most recent email is from today — if not, today's 7:45 AM hasn't arrived yet
const todayKey = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
const nowHour = parseInt(Utilities.formatDate(new Date(), 'Asia/Kolkata', 'HH'), 10);
const nowMin  = parseInt(Utilities.formatDate(new Date(), 'Asia/Kolkata', 'mm'), 10);
if (daysAll[0] !== todayKey && nowHour < 8 && (nowHour < 7 || nowMin < 55)) {
Logger.log('Most recent pre-8AM email is from ' + daysAll[0] + ', not today (' + todayKey + ') — today export not yet arrived');
return null;
}
// Both snapshots target the 7:45 AM export
const tH = NI_CONFIG.TODAY_TARGET_HOUR || 7;
const yH = NI_CONFIG.YESTERDAY_TARGET_HOUR || 7;
const todaySnap = byDay[daysAll[0]].slice().sort((a,b)=>Math.abs(a.hourIST-tH)-Math.abs(b.hourIST-tH))[0];
const yestSnap = byDay[daysAll[1]].slice().sort((a,b)=>Math.abs(a.hourIST-yH)-Math.abs(b.hourIST-yH))[0];
Logger.log('Today : ' + todaySnap.dateStr + ' (target hr=' + tH + ')');
Logger.log('Yesterday : ' + yestSnap.dateStr + ' (target hr=' + yH + ')');
return {
today: todaySnap, yesterday: yestSnap
};
}
// ============================================================
// FETCH CSV
// ============================================================
function fetchCSV_(url) {
const res = UrlFetchApp.fetch(url,{muteHttpExceptions:true});
if (res.getResponseCode()!==200)
return [];
const rows = Utilities.parseCsv(res.getContentText());
if (rows.length<2)
return [];
const h = rows[0].map(x=>x.trim());
// DEBUG: log CSV column headers once so we can verify the Name column mapping Logger.log('CSV columns: ' + h.join(' | '));
return rows.slice(1).map(r=>{
const o={};
h.forEach((k,i)=>o[k]=(r[i]||'').trim());
return o;
});
}
// ============================================================
// SAVE SHEET
// ============================================================
// Save analysis results as small structured sheets the dashboard can read efficiently
// NI_Events: all negative+positive events (~100-500 rows)
// NI_Inventory: per-facility inventory totals (~150 rows)
function saveResultsToSheet_(result, todayData) {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
// -- 1. NI_Events: all movement events (negative + positive) --
const CATEGORY_LABEL = {
g2b: 'Good → Bad', g2q: 'Good → QC Rejected', g2rc: 'Good → Recalled', a2ne: 'Active → Near Expiry', ne2e: 'Near Expiry → Expired', a2e: 'Active → Expired', a2rc: 'Active → Recalled', newBad: 'Direct Bad GRN', newQC: 'Direct QC GRN', pos: 'Recovery (Bad/QC → Good)'
};
// Impact Class - derived from StateFrom (not category)
// Rule: stateFrom=Active - Financial Loss (fresh loss from healthy inventory)
// stateFrom=About_to_expire OR Recalled - Expiry Risk (batch already compromised)
// POS events - Recovery
const evHeaders = ['EH_ID','Date','Type','Direction','Category','SKU','Name','Brand','Batch','Facility','City','BizType','InvFrom','InvTo','StateFrom','StateTo','Qty','COGSPerUnit','COGSValue','Event','Severity','Impact Class'];
const evRows = [evHeaders];
// result.neg = {g2b:[],g2q:[],g2rc:[],a2ne:[],ne2e:[],a2e:[],a2rc:[],newBad:[],newQC:[]}
const negCats = ['g2b','g2q','g2rc','a2ne','ne2e','a2e','a2rc','newBad','newQC'];
negCats.forEach(cat =>
{
const arr = result.neg[cat] || [];
arr.forEach(x =>
{
const ehid = result.todayStr+'|'+(x.sku||'')+'|'+(x.batch||'')+'|'+(x.fac||'')+'|'+(x.event||'');
evRows.push([ehid, result.todayStr, 'NEG', cat, CATEGORY_LABEL[cat]||cat, x.sku||'', x.name||'', getBrandFromSKU_(x.sku||''), x.batch||'', x.fac||'', x.city||'', x.bt||'', x.invFrom||x.iF||'', x.invTo||x.iT||'', x.stateFrom||x.sF||'', x.stateTo||x.sT||'', x.qty||0, x.cogsPerUnit||x.cp||0, x.cogsVal||0, x.event||'', x.sev||'', getImpactClass_(x.sF||x.stateFrom||'', 'NEG', x.iF||x.invFrom||'')]);
});
});
// pos is {b2g:[], q2g:[], rc2a:[]} - flatten all arrays
const posFlat = [].concat(result.pos.b2g||[], result.pos.q2g||[], result.pos.rc2a||[]);
posFlat.forEach(x =>
{
const ehid = result.todayStr+'|'+(x.sku||'')+'|'+(x.batch||'')+'|'+(x.fac||'')+'|'+(x.event||'');
evRows.push([ehid, result.todayStr, 'POS', 'pos', CATEGORY_LABEL['pos'], x.sku||'', x.name||'', getBrandFromSKU_(x.sku||''), x.batch||'', x.fac||'', x.city||'', x.bt||'', x.invFrom||x.iF||'', x.invTo||x.iT||'', x.stateFrom||x.sF||'', x.stateTo||x.sT||'', x.qty||0, x.cogsPerUnit||x.cp||0, x.cogsVal||0, x.event||'', 'Positive', 'Recovery']);
});
// NI_Events: APPEND-ONLY (never clear - history must be preserved)
let shEv = ss.getSheetByName('NI_Events');
if (!shEv) {
shEv = ss.insertSheet('NI_Events');
shEv.getRange(1,1,1,evHeaders.length).setValues([evHeaders]);
shEv.getRange(1,1,1,evHeaders.length).setFontWeight('bold');
shEv.setFrozenRows(1);
}
// Ensure header row exists (safety check)
const evFirstCell = shEv.getLastRow() >
0 ? String(shEv.getRange(1,1).getValue()).trim() : '';
if (evFirstCell !== 'EH_ID' && evFirstCell !== 'Date') {
shEv.clearContents();
shEv.getRange(1,1,1,evHeaders.length).setValues([evHeaders]);
shEv.getRange(1,1,1,evHeaders.length).setFontWeight('bold');
shEv.setFrozenRows(1);
}
// Dedup: skip if today already logged (prevents double-write if trigger runs twice)
const evTodayStr = result.todayStr;
let evTodayExists = false;
if (shEv.getLastRow() > 1) {
const headers_ = shEv.getRange(1,1,1,shEv.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();});
const dateColIdx_ = headers_.indexOf('Date');
const checkCol = dateColIdx_ >= 0 ? dateColIdx_ + 1 : 2; // 1-based; default to col 2 if Date not found
const existingEvDates = shEv.getRange(2, checkCol, shEv.getLastRow()-1, 1).getValues();
evTodayExists = existingEvDates.some(function(row){
return String(row[0]).trim() === evTodayStr;
});
}
if (evTodayExists) {
Logger.log('NI_Events: ' + evTodayStr + ' already logged - skipping append.');
} else
if (evRows.length >
1) {
const evDataRows = evRows.slice(1);
shEv.getRange(shEv.getLastRow()+1, 1, evDataRows.length, evHeaders.length).setValues(evDataRows);
SpreadsheetApp.flush();
Logger.log('NI_Events: appended ' + evDataRows.length + ' events for ' + evTodayStr);
// Also append to NI_Events_Year (running year log: May 2026 onwards)
var shYear = ss.getSheetByName('NI_Events_Year');
if (shYear) {
  var yearHdrs_ = shYear.getRange(1,1,1,shYear.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();});
  var yearDateCol_ = yearHdrs_.indexOf('Date') >= 0 ? yearHdrs_.indexOf('Date') + 1 : 2;
  var yearTodayExists = shYear.getLastRow() > 1 &&
    shYear.getRange(2,yearDateCol_,shYear.getLastRow()-1,1).getValues().some(function(r){ return String(r[0]).trim() === evTodayStr; });
  if (!yearTodayExists) {
    shYear.getRange(shYear.getLastRow()+1, 1, evDataRows.length, evHeaders.length).setValues(evDataRows);
    Logger.log('NI_Events_Year: appended ' + evDataRows.length + ' events for ' + evTodayStr);
  } else {
    Logger.log('NI_Events_Year: ' + evTodayStr + ' already logged - skipping.');
  }
}
}
// -- 2. NI_Inventory: per-facility totals from today snapshot --
const invMap = {};
const facSet = new Set();
todayData.forEach(row =>
{
const sku = (row['Item Type SKU Code']||row['SKU Code']||'').trim();
const fac = (row['Facility']||'').trim();
const inv = (row['Inventory Type']||'').trim();
const state = (row['Batch Status']||'').trim();
const qty = parseFloat(row['Quantity']||0)||0;
const exp = (row['Expiry']||'').trim();
const batch = (row['Batch Code']||row['Batch ID']||'').trim();
const name = (row['Item Type Name']||row['Item Description']||SKU_NAME_CACHE[sku]||'').trim();
if (!sku||!fac||qty===0) return;
facSet.add(fac);
const cp = getCOGS_(sku);
// Per-facility totals
if (!invMap[fac]) invMap[fac] = {good:0,bad:0,qc:0,ne:0,exp:0,total:0,cogsVal:0};
invMap[fac].total += qty;
invMap[fac].cogsVal += cp*qty;
if (inv==='GOOD_INVENTORY') {
invMap[fac].good += qty;
if (state==='About_to_expire') invMap[fac].ne += qty;
if (state==='Expired') invMap[fac].exp += qty;
} else
if (inv==='BAD_INVENTORY') {
invMap[fac].bad += qty;
} else
if (inv==='QC_REJECTED') {
invMap[fac].qc += qty;
}
});
const invHeaders = ['Facility','BizType','City','GoodQty','BadQty','QCQty','NearExpiryQty','ExpiredQty','TotalQty','COGSValue'];
const invRows = [invHeaders];
Object.keys(invMap).forEach(fac =>
{
const d = invMap[fac];
invRows.push([fac, getBizType_(fac), getCity_(fac), d.good, d.bad, d.qc, d.ne, d.exp, d.total, d.cogsVal]);
});
let shInv = ss.getSheetByName('NI_Inventory');
if (!shInv) shInv = ss.insertSheet('NI_Inventory');
shInv.clearContents();
if (invRows.length >
1) {
shInv.getRange(1,1,invRows.length,invHeaders.length).setValues(invRows);
SpreadsheetApp.flush();
} Logger.log('NI_Inventory: ' + (invRows.length-1) + ' facilities saved | ' + facSet.size + ' unique facilities in raw data');
// -- 3. NI_Expiry: items with Manufacturing + Expiry dates for Near-Expiry calculation --
// Filter: GOOD + ACTIVE only (per product documentation)
const expMap = {};
todayData.forEach(row =>
{
const sku = (row['Item Type SKU Code']||row['SKU Code']||'').trim();
const fac = (row['Facility']||'').trim();
const inv = (row['Inventory Type']||'').trim();
const state = (row['Batch Status']||'').trim();
const qty = parseFloat(row['Quantity']||0)||0;
const expStr= (row['Expiry']||'').trim();
const mfgStr= (row['Manufacturing']||row['Mfg Date']||row['Manufacture Date']||'').trim();
const batch = (row['Batch Code']||row['Batch ID']||'').trim();
const name = (row['Item Type Name']||row['Item Description']||SKU_NAME_CACHE[sku]||'').trim();
// GOOD + ACTIVE filter per doc
if (!sku||!fac||!expStr||inv!=='GOOD_INVENTORY'||state!=='Active'||qty===0) return;
const key = sku+'||'+batch+'||'+fac;
if (!expMap[key]) expMap[key] = {sku,name,batch,fac,qty:0,expStr,mfgStr,inv,state};
expMap[key].qty += qty;
});
const expHeaders = ['SKU','Name','Batch','Facility','BizType','City','Qty','Manufacturing','Expiry','BatchStatus'];
const expRows = [expHeaders];
Object.values(expMap).forEach(r =>
{
expRows.push([r.sku,r.name,r.batch,r.fac,getBizType_(r.fac),getCity_(r.fac),r.qty,r.mfgStr,r.expStr,r.state]);
});
let shExp = ss.getSheetByName('NI_Expiry');
if (!shExp) shExp = ss.insertSheet('NI_Expiry');
shExp.clearContents();
if (expRows.length >
1) {
shExp.getRange(1,1,expRows.length,expHeaders.length).setValues(expRows);
SpreadsheetApp.flush();
} Logger.log('NI_Expiry: ' + (expRows.length-1) + ' GOOD+ACTIVE items with Mfg+Expiry dates');
Logger.log('NI_NearExpiry and OperationalMetrics handled by Project 2 (Inventory Overview).');
// -- 4. NI_TodayStock: aggregated by SKU+Facility preserving ALL inventory/status splits --
// Each raw row has a specific Inventory Type and Batch Status - we sum qty into the right bucket
// without collapsing to "dominant type" (which would lose the split)
const stockMap = {};
todayData.forEach(row =>
{
const sku = (row['Item Type SKU Code']||row['SKU Code']||'').trim();
const fac = (row['Facility']||'').trim();
if (!sku || !fac) return;
const key = sku + '||' + fac;
const inv = (row['Inventory Type']||'').trim();
const state = (row['Batch Status']||'').trim();
const qty = parseFloat(row['Quantity']||0)||0;
const blocked = parseFloat(row['Quantity Blocked']||0)||0;
const notFound = parseFloat(row['Quantity Not Found']||0)||0;
const damaged = parseFloat(row['Quantity Damaged']||0)||0;
if (!stockMap[key]) {
stockMap[key] = {
sku: sku, name: (row['Item Type Name']||row['Item Description']||SKU_NAME_CACHE[sku]||'').trim(), fac: fac, goodActive: 0, goodNE: 0, goodExp: 0, goodRec: 0, badActive: 0, badNE: 0, badExp: 0, badRec: 0, qcActive: 0, qcNE: 0, qcExp: 0, qcRec: 0, blockedQty: 0, notFoundQty: 0, damagedQty: 0, batchCount: 0,
};
}
const s = stockMap[key];
// Route quantity into correct bucket based on Inventory Type - Batch Status
if (inv === 'GOOD_INVENTORY') {
if (state === 'Active') s.goodActive += qty;
else
if (state === 'About_to_expire') s.goodNE += qty;
else
if (state === 'Expired') s.goodExp += qty;
else
if (state === 'Recalled') s.goodRec += qty;
else s.goodActive += qty;
// default to Active if state missing
} else
if (inv === 'BAD_INVENTORY') {
if (state === 'Active') s.badActive += qty;
else
if (state === 'About_to_expire') s.badNE += qty;
else
if (state === 'Expired') s.badExp += qty;
else
if (state === 'Recalled') s.badRec += qty;
else s.badActive += qty;
} else
if (inv === 'QC_REJECTED') {
if (state === 'Active') s.qcActive += qty;
else
if (state === 'About_to_expire') s.qcNE += qty;
else
if (state === 'Expired') s.qcExp += qty;
else
if (state === 'Recalled') s.qcRec += qty;
else s.qcActive += qty;
}
// Operational risk columns (independent of inventory type)
s.blockedQty += blocked;
s.notFoundQty += notFound;
s.damagedQty += damaged;
s.batchCount += 1;
});
const stockHeaders = ['SKU','Name','Facility','BizType','City','Brand', 'GoodActive','GoodNearExpiry','GoodExpired','GoodRecalled', 'BadActive','BadNearExpiry','BadExpired','BadRecalled', 'QCActive','QCNearExpiry','QCExpired','QCRecalled', 'Blocked','NotFound','Damaged', 'TotalGood','TotalBad','TotalQC','TotalQty','COGSValue'];
const stockRows = [stockHeaders];
Object.values(stockMap).forEach(r =>
{
const totalGood = r.goodActive + r.goodNE + r.goodExp + r.goodRec;
const totalBad = r.badActive + r.badNE + r.badExp + r.badRec;
const totalQC = r.qcActive + r.qcNE + r.qcExp + r.qcRec;
const totalQty = totalGood + totalBad + totalQC;
const cp = getCOGS_(r.sku);
stockRows.push([ r.sku, r.name, r.fac, getBizType_(r.fac), getCity_(r.fac), getBrandFromSKU_(r.sku), r.goodActive, r.goodNE, r.goodExp, r.goodRec, r.badActive, r.badNE, r.badExp, r.badRec, r.qcActive, r.qcNE, r.qcExp, r.qcRec, r.blockedQty, r.notFoundQty, r.damagedQty, totalGood, totalBad, totalQC, totalQty, cp * totalQty ]);
});
let shStock = ss.getSheetByName('NI_TodayStock');
if (!shStock) shStock = ss.insertSheet('NI_TodayStock');
shStock.clearContents();
const chunk = 5000;
for (let i = 0;
i <
stockRows.length;
i += chunk) {
const c = stockRows.slice(i, i + chunk);
shStock.getRange(i + 1, 1, c.length, stockHeaders.length).setValues(c);
SpreadsheetApp.flush();
} Logger.log('NI_TodayStock: ' + (stockRows.length - 1) + ' SKU+facility rows saved');
// Log totals for verification against manual pivot
let vGood=0,vBad=0,vQC=0,vBlocked=0,vNF=0,vNE=0,vExp=0,vRec=0;
Object.values(stockMap).forEach(r =>
{
vGood += r.goodActive + r.goodNE + r.goodExp + r.goodRec;
vBad += r.badActive + r.badNE + r.badExp + r.badRec;
vQC += r.qcActive + r.qcNE + r.qcExp + r.qcRec;
vBlocked += r.blockedQty;
vNF += r.notFoundQty;
vNE += r.goodNE + r.badNE + r.qcNE;
vExp += r.goodExp + r.badExp + r.qcExp;
vRec += r.goodRec + r.badRec + r.qcRec;
});
Logger.log('Totals → GOOD:' + vGood + ' BAD:' + vBad + ' QC:' + vQC + ' | Blocked:' + vBlocked + ' NotFound:' + vNF + ' | NearExpiry:' + vNE + ' Expired:' + vExp + ' Recalled:' + vRec);
}
// Brand mapping helper for Apps Script
function getBrandFromSKU_(sku) {
if (!sku)
return 'Sample';
const map = {
// Core brands 'MWBW':'Be Bodywise','MWBB':'Be Bodywise', 'MWMM':'Man Matters', 'MWLJ':'Little Joys', 'MWRL':'Root Labs','MWSS':'Root Labs', 'OWNA':'OWN','OWN_':'OWN',
// Packing Material 'POIG':'Packing Material','PCBG':'Packing Material','POBU':'Packing Material', 'PGBB':'Packing Material',
// Raw Material 'PPUG':'Raw Material','PBTG':'Raw Material','PCAG':'Raw Material', 'PTUM':'Raw Material','PDGT':'Raw Material','PGBG':'Raw Material', 'MMUR':'Raw Material','PLBM':'Raw Material','RMMM':'Raw Material', 'PMBT':'Raw Material','POBL':'Raw Material','PDHD':'Raw Material',
};
const brand = map[sku.substring(0,4)] || BRAND_FROM_GRN_[sku];
if (brand)
return brand;
// Anything starting with Sample_ or Samp
if (sku.toLowerCase().startsWith('samp') || sku.toLowerCase().startsWith('sample'))
return 'Sample';
return 'Sample';
// Unknown SKUs
}
// Impact Class - based on StateFrom, not category
// Impact Class rules (invFrom + stateFrom + type):
// GOOD_INVENTORY + stateFrom=Active - Financial Loss (fresh loss from healthy inventory)
// BAD_INVENTORY or QC_REJECTED - Expiry Risk (already bad - loss already counted)
// stateFrom=About_to_expire/Recalled - Expiry Risk (batch already compromised)
// type=POS - Recovery
function getImpactClass_(stateFrom, type, invFrom) {
if (type === 'POS')
return 'Recovery';
// Already bad/QC inventory - financial loss was already counted at g2b stage
if (invFrom === 'BAD_INVENTORY' || invFrom === 'QC_REJECTED')
return 'Expiry Risk';
if (stateFrom === 'Active' || stateFrom === '')
return 'Financial Loss';
if (stateFrom === 'About_to_expire' || stateFrom === 'Recalled')
return 'Expiry Risk';
return 'Financial Loss';
// default for newBad/newQC GRN events (no prior stateFrom)
}
function buildMap_(data) {
// Key = sku||batch||fac - but store ALL inventory types separately
// Returns map[key] = {sku, name, batch, fac, invTypes: {GOOD:qty, BAD:qty, QC:qty}, state, inv(dominant)}
const m = {};
data.forEach(row =>
{
const sku = (row['Item Type SKU Code']||row['SKU Code']||row['SKU']||'').trim();
const name = (row['Item Type Name']||row['Item Name']||row['Name']||row['Product Name']||row['Item Description']||'').trim() || SKU_NAME_CACHE[sku] || '';
// fallback to SKU_Names sheet
const batch = (row['Batch Code']||row['Batch ID']||'').trim();
const fac = (row['Facility']||'').trim();
const inv = (row['Inventory Type']||'').trim();
const state = (row['Batch Status']||'').trim();
if (!sku || !fac) return;
const qty = parseFloat(row['Quantity']||0)||0;
const key = sku+'||'+batch+'||'+fac;
if (!m[key]) m[key] = {sku, name:'', batch, fac, inv:'', state:'', qty:0, invTypes:{GOOD_INVENTORY:0, BAD_INVENTORY:0, QC_REJECTED:0}};
// Preserve first non-blank name found across all rows for this key
if (name &&
!m[key].name) m[key].name = name;
if (inv &&
m[key].invTypes[inv] !== undefined) {
m[key].invTypes[inv] += qty;
} m[key].qty += qty;
// Track dominant inventory type
const best = Object.keys(m[key].invTypes).reduce((a,b) =>
m[key].invTypes[a] >= m[key].invTypes[b] ? a : b);
m[key].inv = best;
if (state &&
inv === m[key].inv) m[key].state = state;
});
return m;
}
// ============================================================
// ANALYSIS - NEGATIVE + POSITIVE + NET
// ============================================================
function analyzeImpact_(yData, tData, todayDate, yesterdayDate) {
const yM=buildMap_(yData), tM=buildMap_(tData);
const allKeys={};
Object.keys(yM).forEach(k=>allKeys[k]=true);
Object.keys(tM).forEach(k=>allKeys[k]=true);
// Negative categories
const neg={g2b:[],g2q:[],g2rc:[],a2ne:[],ne2e:[],a2e:[],a2rc:[],newBad:[],newQC:[]};
// Positive categories
const pos={b2g:[],q2g:[],rc2a:[]};
const facImp={}, bizImp={}, done={};
let totNeg=0,totEv=0,totVal=0;
let totPos=0,posEv=0,posVal=0;
const catFacKey={g2b:'g2b',g2q:'g2q',g2rc:'g2b',a2ne:'expiry',ne2e:'expiry',a2e:'expiry',a2rc:'expiry',newBad:'badGrn',newQC:'badGrn'};
function ensureFac(fac,bt,city) {
if (!facImp[fac]) facImp[fac]={g2b:0,g2q:0,expiry:0,badGrn:0,total:0,totalVal:0,posQty:0,posVal:0,netVal:0,city,bt};
if (!bizImp[bt]) bizImp[bt]= {g2b:0,g2q:0,expiry:0,badGrn:0,total:0,totalVal:0,posQty:0,posVal:0,netVal:0,facs:{}};
}
function addNeg(fac,bt,cat,qty,val,city) {
ensureFac(fac,bt,city);
const k=catFacKey[cat]||'g2b';
facImp[fac][k]+=qty;
facImp[fac].total+=qty;
facImp[fac].totalVal+=val;
facImp[fac].city=city;
facImp[fac].bt=bt;
bizImp[bt][k]+=qty;
bizImp[bt].total+=qty;
bizImp[bt].totalVal+=val;
bizImp[bt].facs[fac]=true;
}
function addPos(fac,bt,qty,val,city) {
ensureFac(fac,bt,city);
facImp[fac].posQty+=qty;
facImp[fac].posVal+=val;
bizImp[bt].posQty+=qty;
bizImp[bt].posVal+=val;
bizImp[bt].facs[fac]=true;
} Object.keys(allKeys).forEach(key=>{
if (done[key]) return;
const y=yM[key], t=tM[key], rec=t||y;
const {sku,batch,fac}=rec;
const cogsPerUnit=getCOGS_(sku, batch);
const bt=getBizType_(fac), city=getCity_(fac);
// Dominant inventory type comparison (neg/pos based on dominant type shift)
const yI=y?y.inv:'', tI=t?t.inv:'';
const yS=y?(y.state||''):'', tS=t?(t.state||''):'';
const yQ=y?(parseFloat(y.qty)||0):0, tQ=t?(parseFloat(t.qty)||0):0;
const qty=(y&&t)?Math.min(yQ,tQ):(tQ||yQ);
const isNew=!y&&!!t;
// Cross-inventory-type detection using invTypes map
const yInv = y ? y.invTypes : {};
const tInv = t ? t.invTypes : {};
const yGood=yInv.GOOD_INVENTORY||0, yBad=yInv.BAD_INVENTORY||0, yQC=yInv.QC_REJECTED||0;
const tGood=tInv.GOOD_INVENTORY||0, tBad=tInv.BAD_INVENTORY||0, tQC=tInv.QC_REJECTED||0;
// POSITIVE: Bad/QC decreased AND Good increased - remediation occurred
const badDecrease = Math.max(0, yBad - tBad);
const qcDecrease = Math.max(0, yQC - tQC);
const goodIncrease= Math.max(0, tGood - yGood);
const posQty = Math.min(badDecrease + qcDecrease, goodIncrease);
if (posQty >
0) {
if (badDecrease >
0) {
const pq = Math.min(badDecrease, posQty);
pos.b2g.push({sku,name:rec.name||'',batch,fac,city,bt,qty:pq,cp:cogsPerUnit, cogsVal:pq*cogsPerUnit,event:'Bad/QC to Good',sev:'Positive', iF:'BAD_INVENTORY',iT:'GOOD_INVENTORY',sF:yS,sT:tS});
addPos(fac,bt,pq,pq*cogsPerUnit,city);
totPos+=pq;
posEv++;
posVal+=pq*cogsPerUnit;
}
if (qcDecrease >
0 &&
qcDecrease !== badDecrease) {
const pq = Math.min(qcDecrease, Math.max(0,posQty-badDecrease));
if (pq >
0) {
pos.q2g.push({sku,name:rec.name||'',batch,fac,city,bt,qty:pq,cp:cogsPerUnit, cogsVal:pq*cogsPerUnit,event:'QC to Good',sev:'Positive', iF:'QC_REJECTED',iT:'GOOD_INVENTORY',sF:yS,sT:tS});
addPos(fac,bt,pq,pq*cogsPerUnit,city);
totPos+=pq;
posEv++;
posVal+=pq*cogsPerUnit;
}
} done[key]=true;
}
// RECALLED-ACTIVE positive
if (yS==='Recalled' &&
tS==='Active' &&
tI==='GOOD_INVENTORY' &&
!done[key]) {
pos.rc2a.push({sku,name:rec.name||'',batch,fac,city,bt,qty,cp:cogsPerUnit, cogsVal:qty*cogsPerUnit,event:'Recalled to Active',sev:'Positive', iF:yI,iT:tI,sF:yS,sT:tS});
addPos(fac,bt,qty,qty*cogsPerUnit,city);
totPos+=qty;
posEv++;
posVal+=qty*cogsPerUnit;
done[key]=true;
}
if (done[key]) return;
// -- NEGATIVE MOVEMENTS --
function addNegCat(catKey,q,ev,sev) {
done[key]=true;
const val=cogsPerUnit*q;
neg[catKey].push({sku,name:rec.name||'',batch,fac,city,bt,qty:q,cogsPerUnit,cogsVal:val,event:ev,sev,invFrom:yI,invTo:tI,sF:yS,sT:tS});
addNeg(fac,bt,catKey,q,val,city);
totNeg+=q;
totEv++;
totVal+=val;
}
// -- POSITIVE MOVEMENTS (same facility, not new batch) --
// Bad/QC - Good (remediation), Recalled - Active
function addPosCat(catArr,q,ev) {
done[key]=true;
const val=cogsPerUnit*q;
catArr.push({sku,name:rec.name||'',batch,fac,city,bt,qty:q,cogsPerUnit,cogsVal:val,event:ev,sev:'Positive',invFrom:yI,invTo:tI,sF:yS,sT:tS});
addPos(fac,bt,q,val,city);
totPos+=q;
posEv++;
posVal+=val;
}
if (!isNew&&y&&t) {
// Negative
// g2b/g2q: ONLY from GOOD+Active source - prevents double-counting batches
// already captured at the About_to_expire (a2ne) stage.
if (yI==='GOOD_INVENTORY'&&yS==='Active'&&tI==='BAD_INVENTORY') {
addNegCat('g2b', qty,'Good to Bad', 'High');
return;
}
if (yI==='GOOD_INVENTORY'&&yS==='Active'&&tI==='QC_REJECTED') {
addNegCat('g2q', qty,'Good to QC', 'High');
return;
}
if (yI==='GOOD_INVENTORY'&&tS==='Recalled') {
addNegCat('g2rc',qty,'Good to Recalled', 'High');
return;
}
// Expiry events - only track GOOD_INVENTORY batches (bad/QC expiry is irrelevant)
if (yI==='GOOD_INVENTORY'&&yS==='Active'&&tS==='About_to_expire'){
addNegCat('a2ne',qty,'Active to Near Expiry', 'Medium');
return;
}
// ne2e: Near Expiry - Expired - SKIP (already captured at a2ne stage, no double-count)
if (yI==='GOOD_INVENTORY'&&yS==='About_to_expire'&&tS==='Expired') {
done[key]=true;
return;
}
// a2e: Active - Expired directly (skipped Near Expiry) - Financial Loss, never captured before
if (yI==='GOOD_INVENTORY'&&yS==='Active'&&tS==='Expired') {
addNegCat('a2e', qty,'Active to Expired', 'High');
return;
}
if (yS!=='Recalled'&&tS==='Recalled') {
addNegCat('a2rc',qty,'Recalled', 'High');
return;
}
// Positive - remediation (same facility, existing batch only)
if ((yI==='BAD_INVENTORY'||yI==='QC_REJECTED')&&tI==='GOOD_INVENTORY') {
addPosCat(pos.b2g,qty,'Bad/QC to Good');
return;
}
if (yS==='Recalled'&&tS==='Active'&&tI==='GOOD_INVENTORY') {
addPosCat(pos.rc2a,qty,'Recalled to Active');
return;
}
}
if (isNew&&tI==='BAD_INVENTORY') {
addNegCat('newBad',tQ,'Direct Bad GRN','High');
return;
}
if (isNew&&tI==='QC_REJECTED') {
addNegCat('newQC', tQ,'Direct QC GRN', 'High');
return;
}
});
// end allKeys.forEach
// Sort all categories by COGS desc
[...Object.values(neg),...Object.values(pos)].forEach(arr=>arr.sort((a,b)=>b.cogsVal-a.cogsVal));
// Compute net per facility and biz type
Object.values(facImp).forEach(f=>{
f.netVal=f.totalVal-f.posVal;
});
Object.values(bizImp).forEach(b=>{
b.netVal=b.totalVal-b.posVal;
});
const netVal = totVal - posVal;
const facRanked=Object.entries(facImp).map(([nm,d])=>({name:nm,...d})).sort((a,b)=>b.netVal-a.netVal);
const bizRanked=Object.entries(bizImp).map(([bt,d])=>({bt,...d,facCount:Object.keys(d.facs).length})).sort((a,b)=>b.netVal-a.netVal);
// Top 5 negative events by COGS > 10K (for remarks)
const allNeg=[...neg.g2b,...neg.g2q,...neg.g2rc,...neg.ne2e,...neg.a2e,...neg.a2ne,...neg.newBad,...neg.newQC] .filter(x=>x.cogsVal>=NI_CONFIG.REMARK_MIN_COGS) .sort((a,b)=>b.cogsVal-a.cogsVal) .slice(0,5);
return {
neg, pos, totNeg, totEv, totVal, totPos, posEv, posVal, netVal, facRanked, bizRanked, top5: allNeg, todayStr: Utilities.formatDate(todayDate, 'Asia/Kolkata','dd MMM yyyy'), yesterdayStr: Utilities.formatDate(yesterdayDate, 'Asia/Kolkata','dd MMM yyyy'),
};
}
// ============================================================
// HELPERS
// ============================================================
function getCOGS_(sku, batch) {
if (!sku)
return 0;
// 1) Batch-level lookup (from COGS_Lookup sheet, loaded at run start)
if (batch &&
BATCH_COGS_CACHE[sku+'||'+batch])
return BATCH_COGS_CACHE[sku+'||'+batch];
// 2) SKU-level master lookup
if (COGS_CACHE[sku])
return COGS_CACHE[sku];
// 3) Fuzzy prefix match (handles _N / _R variants)
const base=sku.replace(/_[NR]$/,'');
for (const k in COGS_CACHE) {
if (k.startsWith(base)||base.startsWith(k))
return COGS_CACHE[k];
}
return 0;
}
function getBizType_(fac) {
if (!fac)
return 'Other';
const MDM_BT = {};
// Build lookup from embedded MDM
const mdm = [{"f":"SL Mother Hub","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"SL PM","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"SL Ambient","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"Aramex","bf":"3PL USA","b":"B2B","c":"Bhiwandi","p":"Aramex","s":"Operational"},{"f":"Inamo_Chembur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"SL RM","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"B2B Beyond NCR ECOM","bf":"3PL B2B","b":"B2B","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"SL RX","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"Inamo_Sion","bf":" DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"B2B Beyond NCR Offline","bf":"3PL B2B","b":"B2B","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"OWN","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"NCR B2B","bf":"3PL B2B","b":"B2B","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"SL NEW","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"BLR B2B","bf":"3PL B2B","b":"B2B","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"BLR B2B Offline","bf":"3PL B2B","b":"B2B","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"OWN Beyond BWD","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"LJ_ER_Thane","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BW EMIZA BLR","bf":"3PL B2C","b":"B2C","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"MM EMIZA BLR","bf":"3PL B2C","b":"B2C","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"B2B Kolkata Offline","bf":"3PL B2B","b":"B2B","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"MM HYD New","bf":"3PL B2C","b":"B2C","c":"Hyderabad","p":"Delhivery","s":"Operational"},{"f":"MM Beyond NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"LJ Kolkata","bf":"3PL B2C","b":"B2C","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"LJ Beyond NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"SL LJ","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"LJ HYD NEW","bf":"3PL B2C","b":"B2C","c":"Hyderabad","p":"Delhivery","s":"Operational"},{"f":"SL MM","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"BW HYD New","bf":"3PL B2C","b":"B2C","c":"Hyderabad","p":"Delhivery","s":"Operational"},{"f":"B2B Ahmedabad Offline","bf":"3PL B2B","b":"B2B","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"BW Beyond NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"LJ Beyond LUC","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Operational"},{"f":"BW Kolkata","bf":"3PL B2C","b":"B2C","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"SL BW","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"BW HYD","bf":"3PL B2C","b":"B2C","c":"Hyderabad","p":"Delhivery","s":"Closed"},{"f":"SL Damage","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"LJ Emiza Guwahati","bf":"3PL B2C","b":"B2C","c":"Guwahati","p":"Emiza","s":"Operational"},{"f":"LJ Ahmedabad","bf":"3PL B2C","b":"B2C","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"LJ EMIZA BLR","bf":"3PL B2C","b":"B2C","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"MM Kolkata","bf":"3PL B2C","b":"B2C","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"OWN Beyond NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"OWN Beyond BLR","bf":"3PL B2C","b":"B2C","c":"Bangalore","p":"Beyond","s":"Operational"},{"f":"MM EMIZA NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Emiza","s":"Closed"},{"f":"LJ_ER_Andheri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM Emiza Guwahati","bf":"3PL B2C","b":"B2C","c":"Guwahati","p":"Emiza","s":"Operational"},{"f":"BW Ahmedabad","bf":"3PL B2C","b":"B2C","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"DTDC_Ernakulum","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kochi","p":"Dark store","s":"Operational"},{"f":"BW Beyond LUC","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Operational"},{"f":"BW Emiza Guwahati","bf":"3PL B2C","b":"B2C","c":"Guwahati","p":"Emiza","s":"Operational"},{"f":"MP BLR","bf":"3PL B2C MP","b":"B2C MP","c":"Bangalore","p":"Emiza","s":"Operational"},{"f":"LJ GLOBAL","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"MP Kolkata","bf":"3PL B2C MP","b":"B2C MP","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"SL B2B ECOM","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"MM Hyd","bf":"3PL B2C","b":"B2C","c":"Hyderabad","p":"Delhivery","s":"Closed"},{"f":"MM Ahmedabad","bf":"3PL B2C","b":"B2C","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"Delhivery_Vadaplani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"Kuik_Begur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Begur","p":"Dark store","s":"Operational"},{"f":"DS Bangalore","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM Beyond LUC","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Operational"},{"f":"LJ_ER_Beleghata","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Charkop","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MP Ahmedabad","bf":"3PL B2C MP","b":"B2C MP","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"LJ_ER_Vikhroli","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"DS Ahmedabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Ahmedabad","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Sanpada","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MP Lucknow","bf":"3PL B2C MP","b":"B2C MP","c":"Lucknow","p":"Beyond","s":"Operational"},{"f":"MM GLOBAL","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"MP Beyond NCR","bf":"3PL B2C MP","b":"B2C MP","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"LJ_Kuik_KalyanNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MP HYD","bf":"3PL B2C MP","b":"B2C MP","c":"Hyderabad","p":"Delhivery","s":"Operational"},{"f":"MP NCR","bf":"3PL B2C MP","b":"B2C MP","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"PnD_East_Delhi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Rahatani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"BB_ER_KalyanNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"PnD_Noida","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"Kuik_DefenceColony","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"Kuik_Vadodara","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Vadodara","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_KalyanNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"PnD_Gurugram","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Banashankari","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"Kuik_Chrompet","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"Kuik_Madipakkam","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"DS_Hyd","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"LJ_Kuik_Memnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Ahmedabad","p":"Dark store","s":"Operational"},{"f":"MM_ER_Banashankari","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_ER_Vikhroli","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BW GLOBAL","bf":"Self Warehouse","b":"B2C","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"LJ_Kuik_Nagpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Nagpur","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Vasai","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_Memnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Ahmedabad","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Uttamnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_Kuik_Abids","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"Kuik_Miyapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"PnD_Okhla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Humayunpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_ER_Rahatani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Kalyan","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_TransportNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"B2B Bhumi","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed - Used for USA Invoicing"},{"f":"RCity Kiosk","bf":"Kiosk","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Operational"},{"f":"BB_ER_Banashankari","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_Abids","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Ruby","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"BB_ER_Rahatani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"BB_ER_Thane","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"PnD_Faridabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_Abids","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"BB_ER_Mundhwa","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ Lucknow","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Closed"},{"f":"Trial inventory","bf":"Trial","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Closed"},{"f":"LJ_ER_Mundhwa","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Nangloi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_Memnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Ahmedabad","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Brookfield","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Chinchwad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Jaipur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Jaipur","p":"Dark store","s":"Operational"},{"f":"LJ_ER_AirportGateNo1","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Kondapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_ER_Ruby","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_ER_Vikhroli","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_ER_Vasai","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_KalyanNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Yeswanthpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM_ER_Kothrud","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Yelahanka","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM_ER_Andheri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Dhanori","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Sarjapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_PatelNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_ER_Beleghata","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"BB_ER_Kalyan","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_ER_Charkop","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Kothrud","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"MM_ER_Charkop","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Jaipur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Jaipur","p":"Dark store","s":"Operational"},{"f":"BB_ER_Kothrud","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"MM_ER_Sanpada","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_ER_Thane","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_Nagpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Nagpur","p":"Dark store","s":"Operational"},{"f":"BB_ER_Andheri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_ER_Sanpada","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_ER_Vasai","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"LJ_ER_KarwanSahu","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_ER_Kalyan","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_ER_Yeswanthpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_ER_AirportGateNo1","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_ER_Yelahanka","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"RM PARASNATH","bf":"Self Warehouse","b":"RM","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"MM_ER_Kondapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_ER_Sarjapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM_ER_Dhanori","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"PnD_Ghaziabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_ER_Chinchwad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"Parasnath","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed - Used for non RX registered Invoicing"},{"f":"MM_ER_Mundhwa","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"BB_PnD_PatelNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MH_ER_Mumbai","bf":"DS Mother Hub","b":"DS Mother Hub","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"RTV GLOBAL","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"LJ_PnD_Lucknow","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Lucknow","p":"Dark store","s":"Operational"},{"f":"BB_ER_Chinchwad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"BB_ER_Dhanori","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Pune","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_Nagpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Nagpur","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Nangloi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_ER_SuchitraJunction","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Nangloi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_ER_Beleghata","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_ER_AirportGateNo1","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_ER_Ruby","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_PnD_TransportNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Lucknow","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Lucknow","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Behala","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_ER_KarwanSahu","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"BB_ER_Behala","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Uttamnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"Exhibition","bf":"Exhibition","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Operational"},{"f":"MM_PnD_PatelNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"SRF_NCR","bf":"3PL B2C","b":"B2C","c":"Virtual facility","p":"Virtual facility","s":"Closed"},{"f":"BB_ER_Yeswanthpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"B2B Global","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BB_ER_Sarjapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_ER_Yelahanka","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_PnD_TransportNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"Lakeshore Thane Kiosk","bf":"Kiosk","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Operational"},{"f":"MM_PnD_Humayunpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"Zippee_Mum_LJ","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Uttamnagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_ER_Kondapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Humayunpur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_ER_Byculla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Jaipur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Jaipur","p":"Dark store","s":"Operational"},{"f":"BB_ER_Brookfield","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM_ER_Byculla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_ER_SuchitraJunction","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_ER_Behala","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Kolkata","p":"Dark store","s":"Operational"},{"f":"MM_ER_Brookfield","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BB_ER_Byculla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"Servicelink","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"LJ_PnD_Gurugram ","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BW EMIZA NCR","bf":"3PL B2C","b":"B2C","c":"Delhi NCR","p":"Emiza","s":"Operational"},{"f":"MM Lucknow","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Closed"},{"f":"DS_Kol","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Virtual facility","p":"Virtual facility","s":"Operational"},{"f":"B2B Kolkata ECOM","bf":"3PL B2B","b":"B2B","c":"Kolkata","p":"Delhivery","s":"Operational"},{"f":"FLIPKART_SMART","bf":"3PL B2C MP","b":"B2C MP","c":"Delhi NCR","p":"Beyond","s":"Operational"},{"f":"BB_PnD_Lucknow","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Lucknow","p":"Dark store","s":"Operational"},{"f":"MM_Delhivery_Nayananda","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"BW Lucknow","bf":"3PL B2C","b":"B2C","c":"Lucknow","p":"Beyond","s":"Closed"},{"f":"LJ_Delhivery_Nayananda","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"Mosaic Wellness Private Limited","bf":"Virtual Facility - Used for US billing","b":"DS fulfillment store","c":"Virtual facility","p":"Virtual facility","s":"Closed"},{"f":"Kuik_Purasaivakkam","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_EastDelhi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Okhla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Noida","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_DefenceColony","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Faridabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_RRNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_Begur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"Zippee_Mum_MM","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"BB_Delhivery_Vadaplani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Gurugram","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Gurugram","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_PnD_EastDelhi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"QDD_Shrinkage","bf":"Virtual DS storage - Damaged Goods","b":"DS fulfillment store","c":"Virtual facility","p":"Virtual facility","s":"Operational"},{"f":"Kuik_RRNagar","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"Zippee_Mum_BB","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Mumbai","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Faridabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ Bhumi","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"LJ_Delhivery_Vadaplani","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"B2B Ahmedabad ECOM","bf":"3PL B2B","b":"B2B","c":"Ahmedabad","p":"Beyond","s":"Operational"},{"f":"OWN B2B","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"OWN Exhibition","bf":"Exhibition","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Operational"},{"f":"BB_PnD_Okhla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_PnD_Ghaziabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"ER_TEST","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Virtual facility","p":"Dark store","s":"Closed"},{"f":"SL B2B Offline","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Operational"},{"f":"BB_PnD_Ghaziabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Faridabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_Blitz_Tirumalagiri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Okhla","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_PnD_EastDelhi","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM_PnD_Ghaziabad","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"LJ_Kuik_DefenceColony","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_Blitz_Tirumalagiri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"DP World","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BW Bhumi","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BB_ER_SuchitraJunction","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"LJ_Kuik_Purasaivakkam","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"MM_Kuik_DefenceColony","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"MM CH 28","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"MM_PnD_Noida","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_PnD_Noida","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BW CH 28","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BB_Kuik_Chrompet","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Chennai","p":"Dark store","s":"Operational"},{"f":"MM MAROL","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BB_ER_KarwanSahu","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MM Bhumi","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"MM CH 14","bf":"Self Warehouse","b":"B2B","c":"Bhiwandi","p":"Self","s":"Closed"},{"f":"BW_Kuik_Begur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"LJ_Kuik_Begur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Bangalore","p":"Dark store","s":"Operational"},{"f":"Vega City Kiosk","bf":"Kiosk","b":"Virtual facility","c":"Virtual facility","p":"Exhibition / Kiosk / Trial","s":"Operational"},{"f":"MM_Blitz_Tirumalagiri","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"},{"f":"MH_PND_DELHI","bf":"DS Mother Hub","b":"DS Mother Hub","c":"Delhi NCR","p":"Dark store","s":"Operational"},{"f":"BB_Kuik_Miyapur","bf":"DS fulfillment store","b":"DS fulfillment store","c":"Hyderabad","p":"Dark store","s":"Operational"}];
mdm.forEach(r =>
{
MDM_BT[r.f.toLowerCase().trim()] = r.bf;
});
const key = fac.toLowerCase().trim();
const bf = MDM_BT[key];
if (bf) {
if (bf === 'Self Warehouse')
return 'Self Warehouse';
if (bf === '3PL B2B')
return '3PL B2B';
if (bf === 'DS fulfillment store' || bf === 'DS Mother Hub' || bf === 'Kiosk')
return 'Dark Store';
if (bf === '3PL B2C' || bf === '3PL B2C MP' || bf === '3PL USA')
return '3PL B2C';
return 'Other';
}
// Fallback patterns
if (key.startsWith('sl ') || key === 'sl mother hub')
return 'Self Warehouse';
if (key.includes('b2b'))
return '3PL B2B';
if (key.includes('_kuik') || key.includes('kuik_') || key.includes('_pnd') || key.includes('pnd_'))
return 'Dark Store';
return '3PL B2C';
}
function getCity_(fac) {
if (!fac)
return '';
const f = fac.toLowerCase().trim();
// Self Warehouse hubs - Bhiwandi (main hub)
if (f === 'sl mother hub' || f === 'sl pm' || f === 'sl ambient' || f === 'sl rm' || f === 'sl rx' || f === 'sl new' || f === 'sl lj' || f === 'sl mm' || f === 'sl bw' || f === 'sl damage' || f === 'sl b2b ecom' || f === 'sl b2b offline')
return 'Bhiwandi';
// Named city patterns
if (f.includes('bangalore') || f.includes(' blr') || f.includes('_blr') || f.startsWith('blr') || f.includes('banashankari') || f.includes('kalyan_nagar') || f.includes('kalyannagar') || f.includes('rr_nagar') || f.includes('rrnagar') || f.includes('begur') || f.includes('defence_colony') || f.includes('defencecolony') || f.includes('chrompet') || f.includes('miyapur') || f.includes('purasaivakkam') || f.includes('madipakkam') || f.includes('yeswanthpur') || f.includes('yelahanka') || f.includes('sarjapur') || f.includes('brookfield') || f.includes('suchibra') || f.includes('suchitra') || f.includes('kondapur') || f.includes('abids') || f.includes('tirumalagiri') || f.includes('rahatani') || f.includes('vadaplani') || f.includes('nayananda'))
return 'Bangalore';
if (f.includes('ncr') || f.includes(' delhi') || f.includes('_delhi') || f.includes('noida') || f.includes('gurugram') || f.includes('faridabad') || f.includes('ghaziabad') || f.includes('okhla') || f.includes('nangloi') || f.includes('patel_nagar') || f.includes('patelnagar') || f.includes('humayunpur') || f.includes('uttam_nagar') || f.includes('uttamnagar') || f.includes('jaipur') || f.includes('transport_nagar') || f.includes('transportnagar') || f.includes('beyond_bwd') || f.includes('beyond bwd') || f === 'own beyond bwd')
return 'Delhi NCR';
if (f.includes('hyderabad') || f.includes(' hyd') || f.includes('_hyd') || f.includes('abids') || f.includes('miyapur') || f.includes('karwansahu') || f.includes('karwan_sahu'))
return 'Hyderabad';
if (f.includes('kolkata') || f.includes(' kol') || f.includes('_kol') || f.includes('beleghata') || f.includes('behala'))
return 'Kolkata';
if (f.includes('ahmedabad') || f.includes(' ahd') || f.includes('_ahd') || f.includes('memnagar') || f.includes('nagpur') || f.includes('vadodara'))
return 'Ahmedabad';
if (f.includes('lucknow') || f.includes(' luc') || f.includes('_luc') || f.includes('beyond_luc') || f.includes('beyond luc'))
return 'Lucknow';
if (f.includes('guwahati') || f.includes('gwh'))
return 'Guwahati';
if (f.includes('mumbai') || f.includes('bhiwandi') || f.includes('thane') || f.includes('andheri') || f.includes('byculla') || f.includes('charkop') || f.includes('vikhroli') || f.includes('sanpada') || f.includes('vasai') || f.includes('kalyan') || f.includes('chinchwad') || f.includes('dhanori') || f.includes('mundhwa') || f.includes('kothrud') || f.includes('er_mum') || f.includes('zippee') || f.includes('inamo') || f.includes('lakeshore') || f.includes('rcity') || f.includes('mh_er') || f.includes('mh_pnd') || f.includes('chembur') || f.includes('sion') || f.includes('bom') || f.includes('marol'))
return 'Mumbai / Thane';
if (f.includes('aramex') || f === 'rtvglobal' || f === 'rtv global' || f === 'parasnath' || f === 'rm parasnath')
return 'Pan India';
return '';
}
function fmtV_(n) {
if (!n||n<=0)
return 'Rs.0';
if (n>=1e7)
return 'Rs.'+(n/1e7).toFixed(2)+' Cr';
if (n>=1e5)
return 'Rs.'+(n/1e5).toFixed(2)+' L';
if (n>=1e3)
return 'Rs.'+(n/1e3).toFixed(1)+'K';
return 'Rs.'+n.toFixed(0);
}
function fmtQ_(n) {
if (n>=1e6)
return (n/1e6).toFixed(2)+'M';
if (n>=1e3)
return (n/1e3).toFixed(1)+'K';
return Math.round(n).toLocaleString();
}
// ============================================================
// NI_REMARKS - read / write
// ============================================================
function getRemarksSheet_() {
const ss=SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh=ss.getSheetByName('NI_Remarks');
if (!sh) {
sh=ss.insertSheet('NI_Remarks');
sh.getRange(1,1,1,13).setValues([[ 'ID','Date','SKU','Batch','Facility','Business Type','COGS Value','Event', 'Remark','Assigned To','Assigned Email','Status','EH_ID' ]]);
sh.getRange(1,1,1,13).setFontWeight('bold');
}
return sh;
}
function saveRemark_(data) {
const sh = getRemarksSheet_();
const ehId = (data.ehId||'').trim();
const compositeKey = [ data.date||'', data.sku||'', data.batch||'', data.facility||'', data.event||'' ].join('|');
// Ensure header has new columns
const headerRow = sh.getRange(1,1,1,15).getValues()[0];
if(!headerRow[13] || String(headerRow[13]).trim()==='') {
sh.getRange(1,14).setValue('Tags');
sh.getRange(1,15).setValue('Updated By');
}
// -- Dedup: find existing row by EH_ID or composite key --
let existingRowIdx = -1;
if (sh.getLastRow() >
1) {
const vals = sh.getRange(2, 1, sh.getLastRow()-1, 15).getValues();
const h = sh.getRange(1, 1, 1, 15).getValues()[0];
const ci = {
ehId:h.indexOf('EH_ID'), sku:h.indexOf('SKU'), date:h.indexOf('Date'), batch:h.indexOf('Batch'), fac:h.indexOf('Facility'), ev:h.indexOf('Event')
};
for (let i = 0;
i <
vals.length;
i++) {
const rowEhId = ci.ehId>=0 ? String(vals[i][ci.ehId]||'').trim() : '';
const rowKey = [ String(vals[i][ci.date]||''), String(vals[i][ci.sku]||''), String(vals[i][ci.batch]||''), String(vals[i][ci.fac]||''), String(vals[i][ci.ev]||'') ].join('|');
if ((ehId &&
rowEhId === ehId) || rowKey === compositeKey) {
existingRowIdx = i + 2;
break;
}
}
}
const editNote = data.isEdit ? ' [Edited by '+(data.updatedBy||'?')+' on '+new Date().toLocaleDateString('en-IN')+']' : '';
const rowData = [ '', data.date||new Date().toLocaleDateString('en-IN'), data.sku||'', data.batch||'', data.facility||'', data.bizType||'', data.cogsVal||0, data.event||'', (data.remark||'')+editNote, data.assignedTo||'', data.assignedEmail||'', data.status||'Completed', data.ehId||'', data.tags||'', data.updatedBy||'' ];
if (existingRowIdx >
1) {
const existingId = sh.getRange(existingRowIdx, 1).getValue();
rowData[0] = existingId;
sh.getRange(existingRowIdx, 1, 1, 15).setValues([rowData]);
Logger.log('saveRemark_: updated row ' + existingRowIdx + ' by ' + (data.updatedBy||'unknown'));
SpreadsheetApp.flush();
// Also update NI_DailyTop5
if (ehId) { saveRemarkToDailyTop5_(ehId, data.remark||'', data.updatedBy||data.assignedTo||'', data.targetSheet||'NI_DailyTop5'); saveRemarkToNIEvents_(ehId, data.remark||''); }
return existingId;
}
const id = 'RMK-' + new Date().getTime();
rowData[0] = id;
sh.appendRow(rowData);
SpreadsheetApp.flush();
Logger.log('saveRemark_: appended new remark ' + id + ' by ' + (data.updatedBy||'unknown'));
// Also update NI_DailyTop5 row
if (ehId) { saveRemarkToDailyTop5_(ehId, data.remark||'', data.updatedBy||data.assignedTo||'', data.targetSheet||'NI_DailyTop5'); saveRemarkToNIEvents_(ehId, data.remark||''); }
return id;
}
function getPendingRemarks_() {
const sh=getRemarksSheet_();
if (sh.getLastRow()<2)
return [];
const data=sh.getDataRange().getValues();
const h=data[0];
return data.slice(1) .filter(r=>String(r[11]).trim()!=='Resolved') .map(r=>{
const o={};
h.forEach((k,i)=>o[k]=r[i]);
return o;
});
}
function updateRemarkStatus_(id, status) {
const sh=getRemarksSheet_();
if (sh.getLastRow()<2)
return false;
const data=sh.getDataRange().getValues();
for (let i=1;i<data.length;i++) {
if (String(data[i][0])===id) {
sh.getRange(i+1,12).setValue(status);
SpreadsheetApp.flush();
return true;
}
}
return false;
}
// ============================================================
// APPEND DAILY HISTORY
// ============================================================
function appendHistory_(result) {
const ss=SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh=ss.getSheetByName('NI_History');
if (!sh) sh = ss.insertSheet('NI_History');
// Always update headers so new columns (Pos Qty, Pos Value etc) are always named
const histHdrs = [['Date','Business Type', 'G2B Qty','G2B Value','G2Q Qty','G2Q Value', 'Expiry Qty','Expiry Value','BadGRN Qty','BadGRN Value', 'Total Neg Qty','Total Neg Value', 'Pos Qty','Pos Value', 'Net Qty','Net Value']];
sh.getRange(1,1,1,16).setValues(histHdrs);
sh.getRange(1,1,1,16).setFontWeight('bold');
const dateStr=result.todayStr;
// -- Dedup: skip if this date already exists in NI_History --
if (sh.getLastRow() >
1) {
const existingDates = sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues() .map(r =>
String(r[0]).trim());
if (existingDates.includes(dateStr)) {
Logger.log('appendHistory_: ' + dateStr + ' already exists — skipping duplicate');
return;
}
}
const rows=result.bizRanked.map(bz=>[ dateStr, bz.bt, bz.g2b, result.neg.g2b.filter(x=>x.bt===bz.bt).reduce((s,x)=>s+x.cogsVal,0), bz.g2q, result.neg.g2q.filter(x=>x.bt===bz.bt).reduce((s,x)=>s+x.cogsVal,0), bz.expiry, [...result.neg.a2ne,...result.neg.ne2e,...result.neg.a2e].filter(x=>x.bt===bz.bt).reduce((s,x)=>s+x.cogsVal,0), bz.badGrn, [...result.neg.newBad,...result.neg.newQC].filter(x=>x.bt===bz.bt).reduce((s,x)=>s+x.cogsVal,0), bz.total, bz.totalVal, bz.posQty, bz.posVal, bz.total-bz.posQty, bz.netVal, ]);
rows.push([ dateStr,'TOTAL', result.neg.g2b.reduce((s,x)=>s+x.qty,0), result.neg.g2b.reduce((s,x)=>s+x.cogsVal,0), result.neg.g2q.reduce((s,x)=>s+x.qty,0), result.neg.g2q.reduce((s,x)=>s+x.cogsVal,0), [...result.neg.a2ne,...result.neg.ne2e,...result.neg.a2e].reduce((s,x)=>s+x.qty,0), [...result.neg.a2ne,...result.neg.ne2e,...result.neg.a2e].reduce((s,x)=>s+x.cogsVal,0), [...result.neg.newBad,...result.neg.newQC].reduce((s,x)=>s+x.qty,0), [...result.neg.newBad,...result.neg.newQC].reduce((s,x)=>s+x.cogsVal,0), result.totNeg, result.totVal, result.totPos, result.posVal, result.totNeg-result.totPos, result.netVal, ]);
sh.getRange(sh.getLastRow()+1,1,rows.length,16).setValues(rows);
SpreadsheetApp.flush();
Logger.log('Appended '+rows.length+' rows to NI_History');
// -- NI_FacHistory: per-facility daily COGS - used for WTD/MTD facility ranking --
const facHdrs = [['Date','Facility','BizType','City','NegQty','NegValue','PosQty','PosValue','NetValue','G2BQty','G2BValue','ExpQty','ExpValue']];
let shFac = ss.getSheetByName('NI_FacHistory');
if (!shFac) {
shFac = ss.insertSheet('NI_FacHistory');
shFac.getRange(1,1,1,13).setValues(facHdrs);
shFac.getRange(1,1,1,13).setFontWeight('bold');
}
// Always update headers shFac.getRange(1,1,1,13).setValues(facHdrs);
// Build per-facility rows from result.facRanked
const facDateStr = result.todayStr;
const facHistRows = result.facRanked.map(f =>
[ facDateStr, f.name||f.bt||'', getBizType_(f.name||f.bt||''), getCity_(f.name||f.bt||''), f.negQty||0, f.negVal||f.totalVal||0, f.posQty||0, f.posVal||0, (f.netVal||0), f.g2bQty||0, f.g2bVal||0, f.expQty||0, f.expVal||0 ]);
if (facHistRows.length >
0) {
// Remove today's existing rows first (avoid duplicates on re-run)
const facData = shFac.getDataRange().getValues();
const keepRows = facData.filter((r, i) =>
i === 0 || String(r[0]).trim() !== facDateStr);
shFac.clearContents();
if (keepRows.length >
0) {
shFac.getRange(1, 1, keepRows.length, 13).setValues(keepRows);
} shFac.getRange(shFac.getLastRow()+1, 1, facHistRows.length, 13).setValues(facHistRows);
SpreadsheetApp.flush();
Logger.log('NI_FacHistory: ' + facHistRows.length + ' facility rows saved for ' + facDateStr);
}
}
// ============================================================
// WTD / MTD
// ============================================================
function getWtdMtd_() {
const ss=SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const sh=ss.getSheetByName('NI_History');
if (!sh||sh.getLastRow()<2)
return null;
const data=sh.getDataRange().getValues();
const rows=data.slice(1);
const now=new Date();
const todayIST=Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd');
const dow=now.getDay(), dBack=dow===0?6:dow-1;
const wkStart=new Date(now);
wkStart.setDate(now.getDate()-dBack);
const wkStr=Utilities.formatDate(wkStart,'Asia/Kolkata','yyyy-MM-dd');
const moStr=Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM')+'-01';
const mk=()=>({g2bQ:0,g2bV:0,g2qQ:0,expQ:0,expV:0,badQ:0,totQ:0,totV:0,posQ:0,posV:0,netV:0,days:0});
const wtd=mk(), mtd=mk(), bizWtd={}, bizMtd={};
rows.forEach(row=>{
const bt=String(row[1]);
let d;
try{d=new Date(row[0]);}catch(e){return;} if(isNaN(d)) return;
const ds=Utilities.formatDate(d,'Asia/Kolkata','yyyy-MM-dd');
const isW=ds>=wkStr&&ds<=todayIST, isM=ds>=moStr&&ds<=todayIST;
function acc(a){
a.g2bQ+=Number(row[2])||0;
a.g2bV+=Number(row[3])||0;
a.g2qQ+=Number(row[4])||0;
a.expQ+=Number(row[6])||0;
a.expV+=Number(row[7])||0;
a.badQ+=Number(row[8])||0;
a.totQ+=Number(row[10])||0;
a.totV+=Number(row[11])||0;
a.posQ+=Number(row[12])||0;
a.posV+=Number(row[13])||0;
a.netV+=Number(row[15])||0;
if(bt==='TOTAL') a.days++;
}
if (bt==='TOTAL') {
if(isW) acc(wtd);
if(isM) acc(mtd);
} else {
if (isW){if(!bizWtd[bt])bizWtd[bt]={totQ:0,totV:0,posV:0,netV:0};bizWtd[bt].totQ+=Number(row[10])||0;bizWtd[bt].totV+=Number(row[11])||0;bizWtd[bt].posV+=Number(row[13])||0;bizWtd[bt].netV+=Number(row[15])||0;}
if (isM){if(!bizMtd[bt])bizMtd[bt]={totQ:0,totV:0,posV:0,netV:0};bizMtd[bt].totQ+=Number( row[10])||0;bizMtd[bt].totV+=Number(row[11])||0;bizMtd[bt].posV+=Number(row[13])||0;bizMtd[bt].netV+=Number(row[15])||0;}
}
});
return {wtd,mtd,bizWtd,bizMtd};
}
// ============================================================
// INTRO WINDOW
// ============================================================
function isIntroWindow_() {
const t=Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
return t>=NI_CONFIG.INTRO_START&&t<=NI_CONFIG.INTRO_END;
}
// ============================================================
// EMAIL
// ============================================================
function sendEmail_(r, wtdMtd, pendingRemarks) {
  const subj = 'Inventory Health Monitor — ' + r.todayStr + ' | Loss: ' + fmtV_(r.totVal) + ' | Recovery: ' + fmtV_(r.posVal) + ' | Net: ' + fmtV_(r.netVal);
  const recoveryRate = r.totVal > 0 ? (r.posVal / r.totVal * 100) : 0;
  const rateColor = recoveryRate >= 30 ? '#166534' : recoveryRate >= 10 ? '#b7410e' : '#c0392b';
  const rateLabel = recoveryRate >= 30 ? 'STRONG' : recoveryRate >= 10 ? 'MODERATE' : 'LOW';
  const totNeg = [...r.neg.g2b,...r.neg.g2q,...r.neg.g2rc,...r.neg.a2ne,...r.neg.ne2e,...r.neg.a2e,...r.neg.a2rc,...r.neg.newBad,...r.neg.newQC];
  const posFlat = [...(r.pos.b2g||[]),...(r.pos.q2g||[]),...(r.pos.rc2a||[])];
  const topNeg = totNeg.slice().sort((a,b)=>b.cogsVal-a.cogsVal).slice(0,10);
  const topPos = posFlat.slice().sort((a,b)=>b.cogsVal-a.cogsVal).slice(0,10);

  // ── SECTION 1: 5-point key insights ──────────────────────────────────
  function buildSummaryHtml() {
    const pts = [];
    pts.push('Total financial loss today: <strong>' + fmtV_(r.totVal) + '</strong> across ' + r.totEv + ' negative events.');
    pts.push('Recovery (positive movements) offset <strong>' + fmtV_(r.posVal) + '</strong> — recovery rate is <strong>' + recoveryRate.toFixed(1) + '% (' + rateLabel + ')</strong>.');
    pts.push('Net COGS impact: <strong>' + fmtV_(r.netVal) + '</strong> effective loss after recoveries.');
    const topNegItem = topNeg[0];
    if (topNegItem) pts.push('Highest single loss: <strong>' + (topNegItem.name||topNegItem.sku) + '</strong> at <strong>' + fmtV_(topNegItem.cogsVal) + '</strong> (' + (topNegItem.fac||'') + ').');
    const mtdLoss = wtdMtd && wtdMtd.mtd ? (wtdMtd.mtd.totVal||0) : 0;
    const mtdRec  = wtdMtd && wtdMtd.mtd ? (wtdMtd.mtd.posVal||0) : 0;
    if (mtdLoss > 0) pts.push('MTD total loss: <strong>' + fmtV_(mtdLoss) + '</strong>, MTD recovery: <strong>' + fmtV_(mtdRec) + '</strong>, MTD net: <strong>' + fmtV_(mtdLoss - mtdRec) + '</strong>.');
    return '<div style="background:#fffbeb;border:1px solid #fcd34d;border-left:5px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:20px">'
      + '<div style="font-size:13px;font-weight:800;color:#92400e;margin-bottom:10px">📋 Key Insights — ' + r.todayStr + '</div>'
      + '<ol style="margin:0;padding-left:18px;font-size:12px;color:#1e293b;line-height:2">'
      + pts.map(p => '<li>' + p + '</li>').join('')
      + '</ol></div>';
  }

  // ── SECTION 2: PNL Movement Dashboard (MTD daily table) ──────────────
  function buildPnlDashboardHtml() {
    try {
      const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
      const sh = ss.getSheetByName('NI_Events');
      if (!sh || sh.getLastRow() < 2) return '';
      const data = sh.getDataRange().getValues();
      const h = data[0].map(x => String(x).trim());
      const iDate=h.indexOf('Date'), iIC=h.indexOf('Impact Class'), iCOGS=h.indexOf('COGSValue');
      const now = new Date();
      const cy = now.getFullYear(), cm = now.getMonth();
      const daily = {};
      data.slice(1).forEach(row => {
        const dv = row[iDate];
        const d = dv instanceof Date ? dv : new Date(String(dv));
        if (!d || isNaN(d) || d.getFullYear()!==cy || d.getMonth()!==cm) return;
        const ic = String(row[iIC]||'').trim();
        const cv = parseFloat(row[iCOGS]||0)||0;
        if (ic!=='Financial Loss' && ic!=='Recovery') return;
        const dk = Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd MMM yyyy');
        if (!daily[dk]) daily[dk] = {neg:0, pos:0, d:d};
        if (ic==='Recovery') daily[dk].pos += cv; else daily[dk].neg += cv;
      });
      const days = Object.keys(daily).sort((a,b) => daily[a].d - daily[b].d);
      if (!days.length) return '';
      let mtdNeg=0, mtdPos=0;
      const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthLabel = MON[cm] + ' ' + cy;
      // KPI row
      days.forEach(dk => { mtdNeg+=daily[dk].neg; mtdPos+=daily[dk].pos; });
      const mtdNet = mtdPos - mtdNeg;
      const mtdRate = mtdNeg>0 ? (mtdPos/mtdNeg*100).toFixed(1) : '0';
      function kpi(label, val, col) {
        return '<td style="padding:12px 14px;text-align:center;border-right:1px solid #e4e8f0">'
          + '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7c85a0;margin-bottom:6px">'+label+'</div>'
          + '<div style="font-size:18px;font-weight:800;font-family:monospace;color:'+col+'">'+fmtV_(Math.abs(val))+'</div>'
          + '</td>';
      }
      // Daily rows (latest first)
      let runNeg=0, runPos=0;
      const dayRows = days.map(dk => { runNeg+=daily[dk].neg; runPos+=daily[dk].pos; return {dk, neg:daily[dk].neg, pos:daily[dk].pos, net:daily[dk].pos-daily[dk].neg, mtdNet:runPos-runNeg}; });
      const tableRows = dayRows.slice().reverse().map((row,i) => {
        const netCol = row.net >= 0 ? '#166534' : '#c0392b';
        const mCol   = row.mtdNet >= 0 ? '#166534' : '#c0392b';
        const bg = i%2===0 ? '#fff' : '#f8fafc';
        return '<tr style="background:'+bg+'">'
          + '<td style="padding:7px 12px;font-size:11px;font-weight:600;color:#1e293b;white-space:nowrap;border-bottom:1px solid #f1f5f9">'+row.dk+'</td>'
          + '<td style="padding:7px 12px;font-size:11px;font-weight:700;color:#c0392b;text-align:right;font-family:monospace;border-bottom:1px solid #f1f5f9">'+fmtV_(row.neg)+'</td>'
          + '<td style="padding:7px 12px;font-size:11px;font-weight:700;color:#166534;text-align:right;font-family:monospace;border-bottom:1px solid #f1f5f9">'+fmtV_(row.pos)+'</td>'
          + '<td style="padding:7px 12px;font-size:11px;font-weight:800;color:'+netCol+';text-align:right;font-family:monospace;border-bottom:1px solid #f1f5f9">'+(row.net>=0?'▲':'▼')+' '+fmtV_(Math.abs(row.net))+'</td>'
          + '<td style="padding:7px 12px;font-size:11px;font-weight:800;color:'+mCol+';text-align:right;font-family:monospace;border-bottom:1px solid #f1f5f9;border-left:2px solid #e4e8f0">'+(row.mtdNet>=0?'▲':'▼')+' '+fmtV_(Math.abs(row.mtdNet))+'</td>'
          + '</tr>';
      }).join('');
      return '<div style="margin-bottom:20px">'
        + '<div style="font-size:14px;font-weight:800;color:#0c1220;margin-bottom:10px">📊 PNL Movement Dashboard — ' + monthLabel + ' (MTD)</div>'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8f0;border-radius:10px;overflow:hidden;margin-bottom:12px"><tr style="background:#f8fafc">'
        + kpi('MTD Financial Loss', mtdNeg, '#c0392b')
        + kpi('MTD Recovery', mtdPos, '#166534')
        + kpi('MTD Net', Math.abs(mtdNet), mtdNet>=0?'#166534':'#c0392b')
        + '<td style="padding:12px 14px;text-align:center"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7c85a0;margin-bottom:6px">MTD Recovery Rate</div><div style="font-size:18px;font-weight:800;font-family:monospace;color:'+rateColor+'">'+mtdRate+'%</div></td>'
        + '</tr></table>'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8f0;border-radius:10px;overflow:hidden">'
        + '<thead><tr style="background:#1e293b">'
        + '<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">Date</th>'
        + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#fca5a5;text-transform:uppercase">Financial Loss</th>'
        + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#86efac;text-transform:uppercase">Recovery</th>'
        + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#e2e8f0;text-transform:uppercase">Daily Net</th>'
        + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#e2e8f0;text-transform:uppercase;border-left:2px solid #334155">MTD Net</th>'
        + '</tr></thead><tbody>' + tableRows + '</tbody></table>'
        + '</div>';
    } catch(e) { return ''; }
  }

  // ── SECTION 3: Impact tables helper ──────────────────────────────────
  function evRow(x, dir) {
    const col = dir==='neg' ? '#c0392b' : '#166534';
    const sign = dir==='neg' ? '−' : '+';
    return '<tr>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">'
      + '<div style="font-size:11px;font-weight:700;color:#0c1220">' + (x.name||x.sku) + '</div>'
      + '<div style="font-size:10px;color:#7c85a0;margin-top:2px">' + (x.sku||'') + ' &nbsp;·&nbsp; ' + (x.fac||'') + (x.city?' — '+x.city:'') + ' &nbsp;·&nbsp; ' + (x.event||'') + '</div>'
      + '</td>'
      + '<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #f1f5f9;white-space:nowrap">'
      + '<div style="font-size:13px;font-weight:800;color:' + col + ';font-family:monospace">' + sign + fmtV_(x.cogsVal) + '</div>'
      + '<div style="font-size:10px;color:#7c85a0">' + fmtQ_(x.qty) + ' units</div>'
      + '</td></tr>';
  }
  function impactTable(title, borderCol, bgCol, items, dir) {
    if (!items.length) return '';
    return '<div style="font-size:14px;font-weight:800;color:#0c1220;margin-bottom:8px">' + title + '</div>'
      + '<div style="border:1px solid ' + borderCol + ';border-radius:10px;overflow:hidden;margin-bottom:20px">'
      + '<table width="100%" cellpadding="0" cellspacing="0">'
      + '<thead><tr style="background:' + bgCol + '">'
      + '<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:#475569;text-transform:uppercase">Product / SKU / Location / Event</th>'
      + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#475569;text-transform:uppercase">COGS Impact</th>'
      + '</tr></thead><tbody>'
      + items.map(x => evRow(x, dir)).join('')
      + '</tbody></table></div>';
  }

  // ── SECTION 4: Monthly Summary by Business Type ───────────────────────
  function buildMonthlyBizHtml() {
    const BT_OWNER = {
      'Self Warehouse': 'Bhavesh Patel',
      'Self Aware':     'Bhavesh Patel',
      '3PL':            'Bhavesh Patel',
      '3PL B2C':        'Shraddha Raut',
      '3PL B2B':        'Shraddha Raut',
      'B2C':            'Shraddha Raut',
      'B2B':            'Shraddha Raut',
      'Dark Store':     'Akshay Ahuja',
      'FBA':            'Rupesh Shelar',
    };
    try {
      const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
      const sh = ss.getSheetByName('NI_DailyTop5');
      if (!sh || sh.getLastRow() < 2) return '';
      const data = sh.getDataRange().getValues();
      const h = data[0].map(x => String(x).trim());
      const now = new Date();
      const cy = now.getFullYear(), cm = now.getMonth();
      const rows = data.slice(1).filter(row => {
        const dv = row[h.indexOf('Date')];
        const d = dv instanceof Date ? dv : new Date(String(dv));
        return d && !isNaN(d) && d.getFullYear()===cy && d.getMonth()===cm;
      });
      if (!rows.length) return '';
      const btMap = {};
      rows.forEach(row => {
        const bt = String(row[h.indexOf('BizType')]||row[h.indexOf('Business Type')]||'Other').trim();
        const rmk = String(row[h.indexOf('Remark')]||'').trim();
        const cv = parseFloat(row[h.indexOf('COGSValue')]||0)||0;
        if (!btMap[bt]) btMap[bt] = {total:0, pending:0, done:0, cogs:0};
        btMap[bt].total++;
        btMap[bt].cogs += cv;
        if (rmk) btMap[bt].done++; else btMap[bt].pending++;
      });
      const BT_ORDER = ['Self Warehouse','3PL B2C','3PL B2B','Dark Store','FBA','3PL','Self Aware'];
      const sorted = [...BT_ORDER.filter(b=>btMap[b]), ...Object.keys(btMap).filter(b=>!BT_ORDER.includes(b))];
      const totalEvents = rows.length;
      const totalPending = rows.filter(row => !String(row[h.indexOf('Remark')]||'').trim()).length;
      const pct = Math.round((totalEvents-totalPending)/totalEvents*100);
      const pcol = pct>=80?'#16a34a':pct>=40?'#d97706':'#dc2626';
      const btRows = sorted.map((bt,i) => {
        const s = btMap[bt];
        const bp = s.total>0 ? Math.round(s.done/s.total*100) : 0;
        const bc = bp>=80?'#16a34a':bp>=40?'#d97706':'#dc2626';
        const bg = i%2===0?'#fff':'#f8fafc';
        return '<tr style="background:'+bg+'">'
          + '<td style="padding:8px 12px;font-size:11px;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9">'+bt+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9">'+(BT_OWNER[bt]||'—')+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;font-weight:700;color:#c0392b;text-align:right;font-family:monospace;border-bottom:1px solid #f1f5f9">'+fmtV_(s.cogs)+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;text-align:center;border-bottom:1px solid #f1f5f9">'+s.total+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;text-align:center;color:#dc2626;font-weight:700;border-bottom:1px solid #f1f5f9">'+s.pending+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;text-align:center;color:#16a34a;font-weight:700;border-bottom:1px solid #f1f5f9">'+s.done+'</td>'
          + '<td style="padding:8px 12px;font-size:11px;text-align:center;font-weight:800;color:'+bc+';border-bottom:1px solid #f1f5f9">'+bp+'%</td>'
          + '</tr>';
      }).join('');
      return '<div style="margin-bottom:20px">'
        + '<div style="display:table;width:100%;margin-bottom:10px">'
        + '<div style="display:table-cell;font-size:14px;font-weight:800;color:#0c1220">📋 Monthly Summary — Business Type Remark Status</div>'
        + '<div style="display:table-cell;text-align:right;font-size:12px;font-weight:800;color:'+pcol+'">'+(totalEvents-totalPending)+'/'+totalEvents+' done &nbsp;·&nbsp; '+pct+'%</div>'
        + '</div>'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e8f0;border-radius:10px;overflow:hidden">'
        + '<thead><tr style="background:#1e293b">'
        + '<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">Business Type</th>'
        + '<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">Owner</th>'
        + '<th style="padding:8px 12px;text-align:right;font-size:9px;font-weight:700;color:#fca5a5;text-transform:uppercase">MTD COGS</th>'
        + '<th style="padding:8px 12px;text-align:center;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase">Events</th>'
        + '<th style="padding:8px 12px;text-align:center;font-size:9px;font-weight:700;color:#fca5a5;text-transform:uppercase">Pending</th>'
        + '<th style="padding:8px 12px;text-align:center;font-size:9px;font-weight:700;color:#86efac;text-transform:uppercase">Done</th>'
        + '<th style="padding:8px 12px;text-align:center;font-size:9px;font-weight:700;color:#e2e8f0;text-transform:uppercase">% Done</th>'
        + '</tr></thead><tbody>' + btRows + '</tbody>'
        + '</table>'
        + (totalPending>0 ? '<div style="margin-top:10px;font-size:10px;color:#0369a1">⚠️ <strong>'+totalPending+' remarks pending</strong> — <a href="'+NI_CONFIG.DASHBOARD_URL+'" style="color:#1a6b5a;font-weight:700">Update on Dashboard →</a></div>' : '<div style="margin-top:10px;font-size:10px;color:#16a34a">✅ All remarks updated for the month</div>')
        + '</div>';
    } catch(e) { return ''; }
  }

  // ── ASSEMBLE EMAIL ───────────────────────────────────────────────────
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
    + '<body style="margin:0;padding:20px;background:#f1f3f8;font-family:\'Segoe UI\',Arial,sans-serif">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">'
    + '<table width="660" cellpadding="0" cellspacing="0" style="max-width:660px">'
    // HEADER
    + '<tr><td style="background:#1a6b5a;border-radius:10px 10px 0 0;padding:20px 24px">'
    + '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">📦 Inventory Health Monitor</div>'
    + '<div style="font-size:11px;color:rgba(255,255,255,.85)"><strong>' + r.yesterdayStr + '</strong> → <strong>' + r.todayStr + '</strong> &nbsp;·&nbsp; Mosaic Wellness Ops</div>'
    + '<div style="margin-top:12px"><a href="' + NI_CONFIG.DASHBOARD_URL + '" style="display:inline-block;padding:7px 16px;background:#fff;border-radius:6px;color:#1a6b5a;font-size:11px;font-weight:800;text-decoration:none">Open Live Dashboard →</a></div>'
    + '</td></tr>'
    // BODY
    + '<tr><td style="background:#fff;border:1px solid #e3e6ee;border-top:none;border-radius:0 0 10px 10px;padding:24px">'
    // 1. Key insights
    + buildSummaryHtml()
    // 2. PNL Movement Dashboard
    + buildPnlDashboardHtml()
    // 3a. Today's Negative Moments
    + impactTable('↓ Today\'s Negative Moments <span style="font-size:11px;font-weight:400;color:#7c85a0">(top 10 by COGS)</span>', '#fecaca', '#fef2f2', topNeg, 'neg')
    // 3b. Today's Positive Moments
    + impactTable('↑ Today\'s Positive Moments <span style="font-size:11px;font-weight:400;color:#7c85a0">(recoveries)</span>', '#bbf7d0', '#f0fdf4', topPos, 'pos')
    // 4. Monthly Summary by BizType
    + buildMonthlyBizHtml()
    // FOOTER
    + '<div style="text-align:center;font-size:10px;color:#7c85a0;padding-top:16px;border-top:1px solid #f1f5f9">'
    + 'Mosaic Wellness · Inventory Health Monitor · Auto-generated report<br>'
    + '<a href="' + NI_CONFIG.DASHBOARD_URL + '" style="color:#1a6b5a;font-weight:700;text-decoration:none">View Full Dashboard →</a>'
    + '</div></td></tr></table></td></tr></table></body></html>';

  if (NI_CONFIG.DRY_RUN) {
    Logger.log('[DRY_RUN] Would send email: ' + subj);
  } else {
    MailApp.sendEmail({to: 'vipul.kotkar@mosaicwellness.in', bcc: NI_CONFIG.REPORT_TO.join(','), subject: subj, htmlBody: html, name: 'Inventory Health Monitor'});
  }
  Logger.log('Email sent — ' + NI_CONFIG.REPORT_TO.length + ' recipients');
}
function barRow(label, val, total, color) {
const pct = total >
0 ? Math.min((val / total) * 100, 100).toFixed(0) : 0;
return `<div style="margin-bottom:10px">
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px">
<span style="color:#3a4257;font-weight:600">${label}</span>
<span style="color:${color};font-weight:700;font-family:monospace">${fmtV_(val)}</span>
</div>
<div style="height:8px;background:#f1f3f8;border-radius:4px;overflow:hidden">
<div style="height:100%;width:${pct}%;background:${color};border-radius:4px"></div>
</div>
</div>`;
}
function doGet(e) {
// doGet only works via Web App URL - not via Run button in editor
if (!e || !e.parameter) {
return ContentService.createTextOutput(JSON.stringify({error:'doGet must be called via Web App URL, not run directly. Deploy as Web App and call via browser.'})).setMimeType(ContentService.MimeType.JSON);
}
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
// -- Diagnostic action: NI_Events row count + date range --
if (e.parameter.action === 'diag') {
  var diagSh = ss.getSheetByName('NI_Events');
  if (!diagSh) return ContentService.createTextOutput(JSON.stringify({error:'NI_Events not found'})).setMimeType(ContentService.MimeType.JSON);
  var diagData = diagSh.getDataRange().getValues();
  var totalRows = diagData.length - 1;
  var diagHeaders = diagData[0].map(function(h){ return String(h).trim(); });
  var iDateDiag = diagHeaders.indexOf('Date');
  var now_d = new Date();
  var cutoff30 = new Date(now_d.getTime() - 30*24*60*60*1000);
  var cutoffCurMon_y = now_d.getFullYear(), cutoffCurMon_m = now_d.getMonth();
  var dates = [], passedCutoff30 = 0, passedCurMonth = 0, failNull = 0;
  for (var di = 1; di < diagData.length; di++) {
    var dv = diagData[di][iDateDiag < 0 ? 0 : iDateDiag];
    var dp = null;
    if (dv instanceof Date && !isNaN(dv.getTime())) dp = dv;
    else if (dv) { var tmp = new Date(String(dv)); if (!isNaN(tmp.getTime())) dp = tmp; }
    if (!dp) { failNull++; continue; }
    dates.push(dp.getTime());
    if (dp >= cutoff30) passedCutoff30++;
    if (dp.getFullYear() === cutoffCurMon_y && dp.getMonth() === cutoffCurMon_m) passedCurMonth++;
  }
  dates.sort(function(a,b){return a-b;});
  var fmt = function(ts){ return ts ? Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), 'dd MMM yyyy') : 'N/A'; };
  var last7 = {};
  var cutoff7 = now_d.getTime() - 7*24*60*60*1000;
  dates.forEach(function(ts){ if(ts>=cutoff7){ var k=Utilities.formatDate(new Date(ts),Session.getScriptTimeZone(),'dd MMM yyyy'); last7[k]=(last7[k]||0)+1; }});
  // Always grab the actual raw value from first data row for diagnostics
  var rawVal1 = diagData.length > 1 ? diagData[1][iDateDiag < 0 ? 0 : iDateDiag] : undefined;
  var rawVal2 = diagData.length > 2 ? diagData[2][iDateDiag < 0 ? 0 : iDateDiag] : undefined;
  var sampleDate = dates.length ? diagData[1][iDateDiag < 0 ? 0 : iDateDiag] : null;
  return ContentService.createTextOutput(JSON.stringify({
    sheet_id: NI_CONFIG.SHEET_ID,
    total_rows: totalRows,
    all_headers: diagHeaders,
    date_col_index: iDateDiag,
    date_col_header: iDateDiag >= 0 ? diagHeaders[iDateDiag] : 'NOT FOUND',
    row1_raw_date: String(rawVal1),
    row1_date_type: typeof rawVal1 + (rawVal1 instanceof Date ? '(Date)' : ''),
    row2_raw_date: String(rawVal2),
    row2_date_type: typeof rawVal2 + (rawVal2 instanceof Date ? '(Date)' : ''),
    rows_date_parsed: dates.length,
    rows_null_date: failNull,
    pass_30day_filter: passedCutoff30,
    pass_curmonth_filter: passedCurMonth,
    earliest_date: fmt(dates[0]),
    latest_date: fmt(dates[dates.length-1]),
    last_7_days: last7
  })).setMimeType(ContentService.MimeType.JSON);
}

// -- Chatbot status --
if (e.parameter.action === 'getChatbotStatus') {
  var enabled = PropertiesService.getScriptProperties().getProperty('CHATBOT_ENABLED');
  var status = enabled === 'false' ? false : true;
  return ContentService.createTextOutput(JSON.stringify({enabled: status})).setMimeType(ContentService.MimeType.JSON);
}

// -- Fetch NI_Events from May 2026 sheet — mapped to canonical 21-col schema --
if (e.parameter.action === 'mayNIEvents') {
  try {
    var MAY_SID = '1yOU97Zo_tNSA9MXC2doT4p9PNhH4KvmLdtlWj_UpSy8';
    var maySS2 = SpreadsheetApp.openById(MAY_SID);
    var maySh2 = maySS2.getSheetByName('NI_Events');
    if (!maySh2 || maySh2.getLastRow() < 2) {
      return ContentService.createTextOutput(JSON.stringify({headers:[], rows:[], total:0})).setMimeType(ContentService.MimeType.JSON);
    }
    // Canonical 21-column schema (same as June NI_Events)
    var CANON = ['Date','Type','Direction','SKU','Name','Brand','Batch','Facility','City',
                 'BizType','InvFrom','InvTo','StateFrom','StateTo','Qty','COGSPerUnit',
                 'COGSValue','Event','Severity','Category','Impact Class'];
    var mayData2 = maySh2.getDataRange().getValues();
    var mayH2 = mayData2[0].map(function(h){ return String(h).trim(); });
    // Log actual headers for debugging
    Logger.log('May NI_Events headers: ' + mayH2.join(' | '));
    Logger.log('May NI_Events total rows: ' + (mayData2.length - 1));
    var mayRows2 = mayData2.slice(1).map(function(row){
      var obj = {};
      // Map actual headers first
      mayH2.forEach(function(h, i){
        var v = row[i];
        obj[h] = v instanceof Date ? Utilities.formatDate(v, 'Asia/Kolkata', 'dd MMM yyyy') : String(v === null || v === undefined ? '' : v);
      });
      // Ensure all 21 canonical columns exist (fill blank if missing)
      var out = {};
      CANON.forEach(function(col){ out[col] = obj[col] || obj[col.toLowerCase()] || ''; });
      return out;
    });
    return ContentService.createTextOutput(JSON.stringify({
      headers: CANON, rows: mayRows2, total: mayRows2.length,
      actual_headers: mayH2
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

// -- Special action: list available archive months --
if (e.parameter.action === 'listArchives') {
const allSheets = ss.getSheets().map(s =>
s.getName());
// Find NI_History_* archives - extract month labels
const months = [];
allSheets.forEach(name =>
{
const m = name.match(/^NI_History_([A-Za-z]+\d{4})$/);
if (m) months.push(m[1]);
});
// Sort chronologically (oldest first)
months.sort((a, b) =>
{
const parse = s =>
{
const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const match = s.match(/^([A-Za-z]+)(\d{4})$/);
return match ? parseInt(match[2]) * 12 + mo.indexOf(match[1]) : 0;
};
return parse(a) - parse(b);
});
return ContentService.createTextOutput(JSON.stringify({months})) .setMimeType(ContentService.MimeType.JSON);
}
// -- Normal sheet fetch (current + archived) --
// Allow NI_* sheets and archived NI_*_MMMyyyy sheets
const sheetName = e.parameter.sheet || 'NI_Events';
const ALLOWED_PATTERN = /^NI_[A-Za-z0-9]+(_[A-Za-z]+\d{4})?$/;
const EXTRA_ALLOWED = ['SKU_Names', 'COGS_Lookup', 'NI_Events_Year'];
if (!ALLOWED_PATTERN.test(sheetName) && EXTRA_ALLOWED.indexOf(sheetName) === -1) {
return ContentService.createTextOutput(JSON.stringify({error:'Sheet not permitted: '+sheetName})) .setMimeType(ContentService.MimeType.JSON);
}
const tab = ss.getSheetByName(sheetName);
if (!tab)
return ContentService.createTextOutput(JSON.stringify({error:'Sheet not found: '+sheetName, available: ss.getSheets().map(s=>s.getName()).filter(n=>n.startsWith('NI_'))})).setMimeType(ContentService.MimeType.JSON);
// Return as compact array-of-arrays format: [headers, row1, row2, ...]
const data = tab.getDataRange().getValues();
if (data.length <
2)
return ContentService.createTextOutput('{"headers":[],"rows":[]}').setMimeType(ContentService.MimeType.JSON);
const headers = data[0].map(x =>
String(x).trim());
// -- Server-side current-month filter (curmonth=1 param) --
// Filters rows where the 'Date' column falls in the current calendar month.
// Handles Date objects AND text strings like "14 Apr 2026" or "2026-04-14"
const curMonthFilter = e.parameter.curmonth === '1';
const dateColIdx = curMonthFilter ? headers.indexOf('Date') : -1;
const now = new Date();
const curYear = now.getFullYear(), curMonth = now.getMonth();
function parseGsDate_(val) {
if (!val &&
val !== 0)
return null;
if (val instanceof Date)
return isNaN(val.getTime()) ? null : val;
var s = String(val).trim();
if (!s)
return null;
// ISO or standard formats
var d = new Date(s);
if (!isNaN(d.getTime()))
return d;
// "14 Apr 2026" or "03 May 2026" (most common from Apps Script text cells)
var MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
var parts = s.split(/[\s\-\/]+/);
if (parts.length >= 3) {
// Try dd MMM yyyy
var mon = MONTHS[(parts[1]||'').toLowerCase().slice(0,3)];
if (mon !== undefined) {
var dd = parseInt(parts[0]), yy = parseInt(parts[2]);
if (dd &&
yy)
return new Date(yy, mon, dd);
}
// Try MMM dd yyyy
var mon2 = MONTHS[(parts[0]||'').toLowerCase().slice(0,3)];
if (mon2 !== undefined) {
var dd2 = parseInt(parts[1]), yy2 = parseInt(parts[2]);
if (dd2 &&
yy2)
return new Date(yy2, mon2, dd2);
}
}
return null;
}
const rows = [];
for (let i = 1;
i <
data.length;
i++) {
const row = data[i];
// Apply month filter using robust date parser
if (curMonthFilter &&
dateColIdx >= 0) {
const parsed = parseGsDate_(row[dateColIdx]);
if (!parsed || parsed.getFullYear() !== curYear || parsed.getMonth() !== curMonth) continue;
}
const r = new Array(headers.length);
for (let j = 0;
j <
headers.length;
j++) {
const val = row[j];
// -- Convert Date objects to readable string before JSON --
if (val instanceof Date &&
!isNaN(val.getTime())) {
r[j] = Utilities.formatDate(val, 'Asia/Kolkata', 'dd MMM yyyy');
} else {
r[j] = val != null ? String(val).trim() : '';
}
} rows.push(r);
}
return ContentService.createTextOutput(JSON.stringify({headers: headers, rows: rows})) .setMimeType(ContentService.MimeType.JSON);
}
// Aggregate snapshot data server-side to keep response small
// Returns one row per unique SKU+Batch+Facility with summed quantities per inventory type
function doPost(e) {
try {
const data=JSON.parse(e.postData.contents);
if (data.action==='saveRemark') {
const id=saveRemark_(data);
return ContentService.createTextOutput(JSON.stringify({success:true,id:id})).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='bulkSaveNIEventRemarks') {
const result=bulkSaveRemarksToNIEvents_(data.rows||[], data.skipIfFilled===true);
return ContentService.createTextOutput(JSON.stringify({success:true,matched:result.matched,total:result.total})).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='chatQuery') {
  const result = handleChatQuery_(data.question || '');
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='setChatbotStatus') {
  const val = data.enabled === true || data.enabled === 'true' ? 'true' : 'false';
  PropertiesService.getScriptProperties().setProperty('CHATBOT_ENABLED', val);
  return ContentService.createTextOutput(JSON.stringify({success:true, enabled: val==='true'})).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='saveUserComment') {
  const result = saveUserComment_(data.ehId, data.comment || '');
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='archiveMonth') {
const results=archiveMonthlyData();
return ContentService.createTextOutput(JSON.stringify({success:true,results:results})).setMimeType(ContentService.MimeType.JSON);
}
if (data.action==='updateStatus') {
const ok=updateRemarkStatus_(data.id,data.status);
return ContentService.createTextOutput(JSON.stringify({success:ok})).setMimeType(ContentService.MimeType.JSON);
}
return ContentService.createTextOutput(JSON.stringify({error:'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
} catch(err) {
return ContentService.createTextOutput(JSON.stringify({error:err.message})).setMimeType(ContentService.MimeType.JSON);
}
}
// ============================================================
// ============================================================
// NI_DailyTop5 - stores top 5 per brand per day with remarks
// Schema (17 cols): EH_ID|Date|Brand|SKU|Name|Batch|Facility|City|BizType|Event|Qty|COGSValue|Rank|Remark|Status|AssignedTo|RemarkDate
// Remarks are saved directly into this sheet - single source of truth
// ============================================================
function getDailyTop5Sheet_() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh = ss.getSheetByName('NI_DailyTop5');
const HEADERS19 = ['EH_ID','Date','Brand','SKU','Name','Batch','Facility','City','BizType','Event','Impact Class','Qty','COGSValue','Rank','Remark','Status','AssignedTo','RemarkDate','UserComment'];
if (!sh) sh = ss.insertSheet('NI_DailyTop5');
// Auto-migrate: if schema doesn't have Impact Class at col 11, clear and recreate
const lastCol = sh.getLastColumn();
const existingHeader = lastCol > 0 ? sh.getRange(1,1,1,lastCol).getValues()[0].map(String) : [];
if (existingHeader.length !== 19 || existingHeader[10] !== 'Impact Class') {
  // Only rebuild if truly wrong schema — not just missing col 19
  if (existingHeader.length < 18 || existingHeader[10] !== 'Impact Class') {
    Logger.log('NI_DailyTop5: schema is ' + existingHeader.length + '-col — clearing and rebuilding to 19-col.');
    sh.clearContents();
    sh.getRange(1,1,1,19).setValues([HEADERS19]);
    sh.getRange(1,1,1,19).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  // If 18-col valid schema: migration will add col 19 via addUserCommentColumn()
}
return sh;
}
// One-time migration: adds UserComment header to col 19 of NI_DailyTop5.
// Safe to run multiple times — skips if col 19 already exists.
function addUserCommentColumn() {
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var sh = ss.getSheetByName('NI_DailyTop5');
  if (!sh) { Logger.log('addUserCommentColumn: NI_DailyTop5 not found'); return; }
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(1, lastCol).getValue();
  if (String(header).trim() === 'UserComment') {
    Logger.log('addUserCommentColumn: already exists at col ' + lastCol);
    return;
  }
  var newCol = lastCol + 1;
  sh.getRange(1, newCol).setValue('UserComment').setFontWeight('bold');
  Logger.log('addUserCommentColumn: added UserComment at col ' + newCol);
}

function makeEhId_(dateStr, sku, batch, fac, event) {
return [dateStr, sku, batch||'', fac, event].join('|');
}
// Called by daily trigger - writes top 5 neg events PER BRAND for today (up to 20 rows total)
function appendDailyTop5_(result, dateStr) {
const sh = getDailyTop5Sheet_();
// Financial Loss only - stateFrom=Active means fresh loss from healthy inventory.
// Expiry Risk (stateFrom=About_to_expire or Recalled) is informational - excluded from Top5.
// ne2e is skipped entirely at capture. newBad/newQC have no stateFrom - default Financial Loss.
const allNeg = Object.keys(result.neg).reduce((arr, cat) =>
{
return arr.concat((result.neg[cat] || []).filter(x =>
{
const sf = x.sF || x.stateFrom || '';
return sf === 'Active' || sf === '';
// '' = newBad/newQC (GRN events, no prior state)
}));
}, []);
if (!allNeg.length) {
Logger.log('appendDailyTop5_: no events.');
return 0;
}
// Load existing EH_IDs - prevent duplicates if trigger runs twice
const existingIds = new Set();
if (sh.getLastRow() >
1) {
sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues() .forEach(r =>
existingIds.add(String(r[0]).trim()));
}
// Group by brand, sort each group by COGSValue desc, take top 5 per brand
const byBrand = {};
allNeg.forEach(x =>
{
const brand = getBrandFromSKU_(x.sku||'') || 'Other';
if (!byBrand[brand]) byBrand[brand] = [];
byBrand[brand].push(x);
});
Object.values(byBrand).forEach(arr =>
arr.sort((a,b) =>
b.cogsVal - a.cogsVal));
const rows = [];
Object.keys(byBrand).sort().forEach(brand =>
{
byBrand[brand].slice(0, 5).forEach((x, idx) =>
{
// Derive revised event name from original event + StateTo
const sT_ = x.sT || x.stateTo || '';
const origEv_ = x.event || '';
let revisedEv = origEv_;
if(origEv_ === 'Good to Bad') {
  if(sT_ === 'About_to_expire') revisedEv = 'Active to Near Expiry';
  else if(sT_ === 'Recalled') revisedEv = 'Active to Recalled';
} else if(origEv_ === 'Good to Recalled') {
  revisedEv = 'Active to Recalled';
} else if(origEv_ === 'Direct QC GRN') {
  revisedEv = (sT_ === 'About_to_expire' || sT_ === 'Expired') ? 'Direct Expired GRN' : 'Direct Bad GRN';
} else if(origEv_ === 'Direct Bad GRN') {
  if(sT_ === 'About_to_expire' || sT_ === 'Expired') revisedEv = 'Direct Expired GRN';
}
const isAutoRmk_ = revisedEv === 'Active to Near Expiry' || revisedEv === 'Active to Recalled';
const autoRmkTxt_ = revisedEv === 'Active to Near Expiry' ? 'System Triggered - Expiry workflow'
                  : revisedEv === 'Active to Recalled' ? 'QC Triggered - Batch Recalled' : '';
const ehId = makeEhId_(dateStr, x.sku, x.batch||'', x.fac, revisedEv);
if (existingIds.has(ehId)) return;
rows.push([ ehId, dateStr, brand, x.sku, x.name||'', x.batch||'', x.fac, x.city||'', x.bt, revisedEv, getImpactClass_(x.sF||x.stateFrom||'', 'NEG', x.iF||x.invFrom||''), x.qty, x.cogsVal, idx+1, autoRmkTxt_, isAutoRmk_?'Completed':'Pending', isAutoRmk_?'System':'', isAutoRmk_?dateStr:'' ]);
});
});
if (rows.length >
0) {
sh.getRange(sh.getLastRow()+1, 1, rows.length, 18).setValues(rows);
SpreadsheetApp.flush();
Logger.log('appendDailyTop5_: saved ' + rows.length + ' events for ' + dateStr);
} else {
Logger.log('appendDailyTop5_: already logged for ' + dateStr);
}
return rows.length;
}
// Save remark into NI_Events row by EH_ID (Date|SKU|Batch|Facility|Event)
function saveRemarkToNIEvents_(ehId, remark) {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  const sh = ss.getSheetByName('NI_Events');
  if (!sh || sh.getLastRow() < 2) return false;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  let rmkCol = headers.indexOf('Remark') + 1;
  if (rmkCol === 0) {
    rmkCol = headers.length + 1;
    sh.getRange(1, rmkCol).setValue('Remark');
    headers.push('Remark');
  }
  const cEHID = headers.indexOf('EH_ID');
  const ncol = Math.max(rmkCol, cEHID + 1);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, ncol).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][cEHID]) === ehId) {
      sh.getRange(i + 2, rmkCol).setValue(remark);
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}

// Batch: write many remarks to NI_Events in one pass (efficient for bulk uploads)
// skipIfFilled=true → skip rows that already have a non-empty Remark value
function bulkSaveRemarksToNIEvents_(remarksArr, skipIfFilled) {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  const sh = ss.getSheetByName('NI_Events');
  if (!sh || sh.getLastRow() < 2) return { matched: 0, total: remarksArr.length };
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  let rmkCol = headers.indexOf('Remark') + 1;
  if (rmkCol === 0) {
    rmkCol = headers.length + 1;
    sh.getRange(1, rmkCol).setValue('Remark');
  }
  const cEHID = headers.indexOf('EH_ID');
  const ncol = Math.max(rmkCol, cEHID + 1);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, ncol).getValues();
  // Build index: ehId → row index in data[]
  const idx = {};
  for (let i = 0; i < data.length; i++) {
    idx[String(data[i][cEHID])] = i;
  }
  // Apply remarks in-memory, then batch-write changed cells
  let matched = 0;
  remarksArr.forEach(function(item) {
    const i = idx[item.ehId];
    if (i !== undefined) {
      if (skipIfFilled) {
        const existing = String(data[i][rmkCol - 1] || '').trim();
        if (existing !== '') return;
      }
      sh.getRange(i + 2, rmkCol).setValue(item.remark);
      matched++;
    }
  });
  SpreadsheetApp.flush();
  Logger.log('bulkSaveRemarksToNIEvents_: ' + matched + '/' + remarksArr.length + ' matched');
  return { matched: matched, total: remarksArr.length };
}

// One-time backfill: adds EH_ID column to NI_Events + NI_Events_Year and fills all existing rows.
// EH_ID = Date|SKU|Batch|Facility|Event  (same format as NI_DailyTop5)
// Safe to run multiple times — skips rows that already have an EH_ID.
function backfillNIEventsEHID() {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  ['NI_Events', 'NI_Events_Year'].forEach(function(shName) {
    const sh = ss.getSheetByName(shName);
    if (!sh || sh.getLastRow() < 2) { Logger.log(shName + ': empty, skipping'); return; }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    let ehCol = headers.indexOf('EH_ID') + 1; // 1-based
    if (ehCol === 0) {
      // Insert EH_ID as first column
      sh.insertColumnBefore(1);
      sh.getRange(1, 1).setValue('EH_ID').setFontWeight('bold');
      ehCol = 1;
      headers.unshift('EH_ID');
    }
    const cDate = headers.indexOf('Date');
    const cSKU  = headers.indexOf('SKU');
    const cBatch = headers.indexOf('Batch');
    const cFac  = headers.indexOf('Facility');
    const cEv   = headers.indexOf('Event');
    const lastRow = sh.getLastRow();
    const ncol = Math.max(cDate, cSKU, cBatch, cFac, cEv) + 1;
    const data = sh.getRange(2, 1, lastRow - 1, ncol).getValues();
    let filled = 0;
    const updates = [];
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][ehCol - 1]).trim() !== '') continue; // already has EH_ID
      const d = data[i][cDate];
      const rowDate = d instanceof Date
        ? Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd')
        : String(d).substring(0, 10);
      const ehid = rowDate + '|' + data[i][cSKU] + '|' + data[i][cBatch] + '|' + data[i][cFac] + '|' + data[i][cEv];
      updates.push([ehid]);
      sh.getRange(i + 2, ehCol).setValue(ehid);
      filled++;
      if (filled % 500 === 0) SpreadsheetApp.flush();
    }
    SpreadsheetApp.flush();
    Logger.log(shName + ': backfilled EH_ID for ' + filled + ' rows');
  });
}

// Repair NI_DailyTop5 after bulk-upload wrote to wrong columns (off-by-one on Impact Class).
// What happened per affected row:
//   col Rank      ← remark text  (should be numeric rank)
//   col Remark    ← "Completed"  (should be remark text)
//   col Status    ← "Bulk Upload"(should be "Completed")
//   col AssignedTo← a date       (should be "Bulk Upload")
// This function:
//   1. Detects affected rows (Rank cell is non-numeric text)
//   2. Rescues remark text from Rank cell → writes to Remark, fixes Status/AssignedTo/RemarkDate
//   3. Recomputes correct numeric Rank for ALL rows by sorting each Date+Brand group by COGSValue desc
// Diagnostic: run from editor to verify EH_ID lookup in NI_Events works.
// Rebuilds NI_Events for June 2026 from NI_Events_Year (which is the source of truth).
// Clears NI_Events entirely and rewrites with all June 2026 rows from NI_Events_Year.
// Run once manually to recover from data loss.
function restoreJuneFromYearSheet() {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  const shYear = ss.getSheetByName('NI_Events_Year');
  if (!shYear || shYear.getLastRow() < 2) { Logger.log('NI_Events_Year not found or empty'); return; }

  const yearData = shYear.getDataRange().getValues();
  const yearHeaders = yearData[0].map(function(h){ return String(h).trim(); });
  const dtIdx = yearHeaders.indexOf('Date');
  if (dtIdx < 0) { Logger.log('Date column not found in NI_Events_Year'); return; }

  // Filter June 2026 rows
  var juneRows = [];
  for (var i = 1; i < yearData.length; i++) {
    var rawDate = yearData[i][dtIdx];
    var dateStr = (rawDate instanceof Date) ? Utilities.formatDate(rawDate, 'Asia/Kolkata', 'dd MMM yyyy') : String(rawDate).trim();
    // Match June 2026
    if (dateStr.indexOf('Jun 2026') >= 0 || dateStr.indexOf('2026-06') >= 0) {
      juneRows.push(yearData[i]);
    }
  }
  Logger.log('NI_Events_Year: found ' + juneRows.length + ' June 2026 rows');
  if (!juneRows.length) { Logger.log('No June 2026 rows found in NI_Events_Year'); return; }

  // Rebuild NI_Events with the year sheet headers + June rows
  var shEv = ss.getSheetByName('NI_Events');
  if (!shEv) shEv = ss.insertSheet('NI_Events');
  shEv.clearContents();
  shEv.getRange(1, 1, 1, yearHeaders.length).setValues([yearHeaders]);
  shEv.getRange(1, 1, 1, yearHeaders.length).setFontWeight('bold');
  shEv.setFrozenRows(1);
  shEv.getRange(2, 1, juneRows.length, yearHeaders.length).setValues(juneRows);
  SpreadsheetApp.flush();
  Logger.log('NI_Events: restored ' + juneRows.length + ' June 2026 rows from NI_Events_Year');
}

// Recovers missing Date values in NI_Events by extracting from EH_ID (format: "Date|SKU|Batch|Fac|Event")
// Run once manually if dates were accidentally wiped.
function repairNIEventsDates() {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  ['NI_Events','NI_Events_Year'].forEach(function(shName) {
    const sh = ss.getSheetByName(shName);
    if (!sh || sh.getLastRow() < 2) { Logger.log(shName + ': not found or empty'); return; }
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(h){return String(h).trim();});
    const ehIdx = headers.indexOf('EH_ID');
    const dtIdx = headers.indexOf('Date');
    if (ehIdx < 0 || dtIdx < 0) { Logger.log(shName + ': EH_ID or Date column missing'); return; }
    const data = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
    var fixed = 0;
    data.forEach(function(row, i) {
      var existing = String(row[dtIdx]).trim();
      if (existing && existing !== '' && existing !== 'undefined') return; // already has date
      var ehid = String(row[ehIdx]).trim();
      if (!ehid) return;
      var date = ehid.split('|')[0]; // EH_ID starts with date
      if (!date) return;
      sh.getRange(i + 2, dtIdx + 1).setValue(date);
      fixed++;
    });
    SpreadsheetApp.flush();
    Logger.log(shName + ': repaired ' + fixed + ' rows');
  });
}

// Logs first 5 EH_IDs found and attempts to match a known test ID.
function diagNIEventsEHID() {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  const sh = ss.getSheetByName('NI_Events');
  if (!sh) { Logger.log('NI_Events not found'); return; }
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Logger.log('Headers (first 5): ' + headers.slice(0,5).join(' | '));
  Logger.log('EH_ID col index (0-based): ' + headers.indexOf('EH_ID'));
  Logger.log('Remark col index (0-based): ' + headers.indexOf('Remark'));
  Logger.log('Total cols: ' + headers.length);
  const cEHID = headers.indexOf('EH_ID');
  const data = sh.getRange(2, 1, Math.min(10, sh.getLastRow()-1), cEHID+1).getValues();
  Logger.log('First 5 EH_IDs from sheet:');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    Logger.log('  [' + i + '] ' + data[i][cEHID]);
  }
  // Test match with first known EH_ID
  const testId = data[0][cEHID];
  Logger.log('Test match for: ' + testId);
  const idx = {};
  const allData = sh.getRange(2, 1, sh.getLastRow()-1, cEHID+1).getValues();
  for (let i = 0; i < allData.length; i++) idx[String(allData[i][cEHID])] = i;
  Logger.log('idx lookup result: ' + idx[testId]);
  Logger.log('Total entries in idx: ' + Object.keys(idx).length);
}

function repairDailyTop5Rank() {
  const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  const sh = ss.getSheetByName('NI_DailyTop5');
  if (!sh || sh.getLastRow() < 2) { Logger.log('repairDailyTop5Rank: sheet empty'); return; }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const ci = {
    date:       headers.indexOf('Date'),
    brand:      headers.indexOf('Brand'),
    cogs:       headers.indexOf('COGSValue'),
    rank:       headers.indexOf('Rank'),
    remark:     headers.indexOf('Remark'),
    status:     headers.indexOf('Status'),
    assignedTo: headers.indexOf('AssignedTo'),
    remarkDate: headers.indexOf('RemarkDate'),
  };
  if (ci.rank < 0 || ci.remark < 0) { Logger.log('repairDailyTop5Rank: required columns not found'); return; }

  const lastRow = sh.getLastRow();
  const data = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();

  // Step 1: Fix rows where Rank contains remark text (non-numeric)
  let remarksRestored = 0;
  data.forEach((row, i) => {
    const rankVal = String(row[ci.rank] || '').trim();
    const isNumeric = rankVal === '' || !isNaN(Number(rankVal));
    if (!isNumeric) {
      // Rank cell holds the remark text — rescue it
      const savedRemark = rankVal;
      row[ci.remark]     = savedRemark;        // restore remark text
      if (ci.status     >= 0) row[ci.status]     = 'Completed';
      if (ci.assignedTo >= 0) row[ci.assignedTo] = 'Bulk Upload';
      if (ci.remarkDate >= 0) row[ci.remarkDate] = new Date();
      row[ci.rank] = '';                        // clear rank; will be set in step 2
      remarksRestored++;
    }
  });

  // Step 2: Recompute correct Rank for all rows (sort Date+Brand group by COGSValue desc)
  const groups = {};
  data.forEach((row, i) => {
    const date  = String(row[ci.date]).substring(0, 10);
    const brand = String(row[ci.brand] || '');
    const key   = date + '|' + brand;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ i, cogs: parseFloat(row[ci.cogs]) || 0 });
  });
  Object.values(groups).forEach(group => {
    group.sort((a, b) => b.cogs - a.cogs);
    group.forEach((item, rank0) => { data[item.i][ci.rank] = rank0 + 1; });
  });

  // Write all changed columns back in one batch
  sh.getRange(2, 1, lastRow - 1, headers.length).setValues(data);
  SpreadsheetApp.flush();

  const msg = 'Repair complete!\n'
    + '• Remarks restored: ' + remarksRestored + ' rows\n'
    + '• Rank recomputed: all ' + data.length + ' rows across ' + Object.keys(groups).length + ' Date+Brand groups';
  Logger.log(msg);
}

// Save remark directly into NI_DailyTop5 row by EH_ID
function saveRemarkToDailyTop5_(ehId, remark, assignedTo, sheetName) {
sheetName = sheetName || 'NI_DailyTop5';
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const sh = ss.getSheetByName(sheetName);
if (!sh) {
Logger.log('saveRemarkToDailyTop5_: sheet not found — ' + sheetName);
return false;
}
if (sh.getLastRow() < 2) return false;
// Use header-based column lookup to be safe against schema changes
const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
const col = (name) => headers.indexOf(name) + 1;
const cRemark = col('Remark'), cStatus = col('Status'), cAssigned = col('AssignedTo'), cDate = col('RemarkDate');
if (cRemark < 1) { Logger.log('saveRemarkToDailyTop5_: Remark column not found'); return false; }
const data = sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).getValues();
for (let i = 0; i < data.length; i++) {
if (String(data[i][0]).trim() === ehId) {
const row = i + 2;
let remarkBy = assignedTo || '';
if (!remarkBy) { try { remarkBy = Session.getActiveUser().getEmail() || ''; } catch(e) {} }
sh.getRange(row, cRemark).setValue(remark);
if (cStatus  > 0) sh.getRange(row, cStatus).setValue('Completed');
if (cAssigned > 0) sh.getRange(row, cAssigned).setValue(remarkBy);
if (cDate    > 0) sh.getRange(row, cDate).setValue(new Date());
SpreadsheetApp.flush();
Logger.log('saveRemarkToDailyTop5_: saved remark for ' + ehId + ' in ' + sheetName);
return true;
}
}
Logger.log('saveRemarkToDailyTop5_: EH_ID not found — ' + ehId + ' in ' + sheetName);
return false;
}

// Writes user comment to UserComment col for a given EH_ID.
// Idempotency guard: returns {error:'already_saved'} if UserComment is already non-blank.
function saveUserComment_(ehId, comment) {
  if (!ehId || !comment || !comment.trim()) return {error:'missing_fields'};
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var sh = ss.getSheetByName('NI_DailyTop5');
  if (!sh) return {error:'sheet_not_found'};
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return {error:'no_data'};
  var lastCol = sh.getLastColumn();
  var data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h).trim(); });
  var ucIdx = headers.indexOf('UserComment');
  if (ucIdx < 0) return {error:'UserComment_column_missing'};
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === ehId) {
      var existing = String(data[i][ucIdx] || '').trim();
      if (existing) return {error:'already_saved'};
      sh.getRange(i + 2, ucIdx + 1).setValue(comment.trim());
      SpreadsheetApp.flush();
      Logger.log('saveUserComment_: saved for ' + ehId);
      return {ok:true};
    }
  }
  return {error:'ehid_not_found'};
}

// ------------------------------------------------------------------------------
// COGS LOOKUP - load batch/brand data from COGS_Lookup sheet into memory
// Call once at the top of runDailyNIUpdate()
// ------------------------------------------------------------------------------
function loadCOGSLookup_() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const sh = ss.getSheetByName('COGS_Lookup');
if (!sh || sh.getLastRow() <
2) {
Logger.log('loadCOGSLookup_: COGS_Lookup sheet not found or empty — using embedded cache only.');
return;
}
const data = sh.getRange(2, 1, sh.getLastRow()-1, 5).getValues();
const headers = sh.getRange(1, 1, 1, 5).getValues()[0].map(String);
const iSku = headers.indexOf('SKU');
const iBatch = headers.indexOf('Batch');
const iCOGS = headers.indexOf('COGSPerUnit');
const iBrand = headers.indexOf('Brand');
if (iSku <
0 || iCOGS <
0) {
Logger.log('loadCOGSLookup_: unexpected header.');
return;
}
let batchHits = 0, skuHits = 0;
data.forEach(r =>
{
const sku = String(r[iSku] ||'').trim();
const batch = iBatch >= 0 ? String(r[iBatch]||'').trim() : '';
const cogs = parseFloat(r[iCOGS])||0;
const brand = iBrand >= 0 ? String(r[iBrand]||'').trim() : '';
if (!sku || !cogs) return;
if (batch) {
BATCH_COGS_CACHE[sku+'||'+batch] = cogs;
batchHits++;
} else {
if (!COGS_CACHE[sku]) {
COGS_CACHE[sku] = cogs;
skuHits++;
}
}
if (brand &&
!BRAND_FROM_GRN_[sku]) BRAND_FROM_GRN_[sku] = brand;
});
Logger.log('loadCOGSLookup_: loaded ' + batchHits + ' batch entries, ' + skuHits + ' new SKU entries.');
}
// Loads SKU_Names sheet into SKU_NAME_CACHE for runtime name lookup
// Sheet schema: SKU | Name (header row required)
function loadSKUNames_() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const sh = ss.getSheetByName('SKU_Names');
if (!sh || sh.getLastRow() <
2) {
Logger.log('loadSKUNames_: SKU_Names sheet not found or empty — run createSKUNamesSheet first.');
return;
}
const data = sh.getRange(2, 1, sh.getLastRow()-1, 2).getValues();
let hits = 0;
data.forEach(r =>
{
const sku = String(r[0]||'').trim();
const name = String(r[1]||'').trim();
if (sku &&
name) {
SKU_NAME_CACHE[sku] = name;
hits++;
}
});
Logger.log('loadSKUNames_: loaded ' + hits + ' SKU→Name mappings.');
}
// Run once to create/refresh the COGS_Lookup sheet from GRN-derived data.
// Rows: SKU | Batch (blank=SKU-level) | COGSPerUnit | Brand
// You can add batch rows manually for batch-specific overrides.
function createCOGSLookupSheet() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh = ss.getSheetByName('COGS_Lookup');
if (!sh) sh = ss.insertSheet('COGS_Lookup');
sh.clearContents();
const HEADERS = [['SKU','Batch','COGSPerUnit','Brand','Source']];
sh.getRange(1,1,1,5).setValues(HEADERS);
sh.getRange(1,1,1,5).setFontWeight('bold');
sh.setFrozenRows(1);
// Pre-populated SKU-level rows from GRN analysis (668 SKUs)
const rows = [ ['GI32',15.0,'Other'], ['GI7',15.0,'Other'], ['GI8',15.0,'Other'], ['GI9',28.0,'Other'], ['MMURB01',2.86,'Other'], ['MMURC01',1.8,'Other'], ['MMURR01',1.84,'Other'], ['MWBBNTP.2059.BO_N',17.89,'Be Bodywise'], ['MWBBOCP.009.BO_N',44.0,'Be Bodywise'], ['MWBBSKP.00807.BO_N',60.75,'Be Bodywise'], ['MWBBSKP.00808.BO_N',59.13,'Be Bodywise'], ['MWBBSKP.00812.BO_N',71.48,'Be Bodywise'], ['MWBBSKP.00813.BO_N',28.97,'Be Bodywise'], ['MWBWBCP.00166.B0_N',62.66,'Be Bodywise'], ['MWBWBCP.00167.B0_N',182.78,'Be Bodywise'], ['MWBWBCP.00168.B0_N',139.58,'Be Bodywise'], ['MWBWBCP.00170.B0_N',106.02,'Be Bodywise'], ['MWBWBCP.00188.BO_N',59.0,'Be Bodywise'], ['MWBWHFFS.0039.B0_N',11.44,'Be Bodywise'], ['MWBWHFFS.0040.B0_N',18.66,'Be Bodywise'], ['MWBWHFFS.0041.B0_N',12.98,'Be Bodywise'], ['MWBWHFP.00129.B0_N',165.0,'Be Bodywise'], ['MWBWHFP.00145.B0_N',189.25,'Be Bodywise'], ['MWBWHFP.00159.B0_N',495.11,'Be Bodywise'], ['MWBWHFP.00160.B0_N',120.7,'Be Bodywise'], ['MWBWHFP.00161.B0_N',43.02,'Be Bodywise'], ['MWBWHFP.00167.B0_N',122.19,'Be Bodywise'], ['MWBWHFP.0017.B0_N',65.88,'Be Bodywise'], ['MWBWHFP.00172.B0_N',76.85,'Be Bodywise'], ['MWBWHFP.0018.B0_N',91.82,'Be Bodywise'], ['MWBWHFP.00188.BO_N',194.94,'Be Bodywise'], ['MWBWHFP.0019.B0_N',93.39,'Be Bodywise'], ['MWBWHFP.0020.B0_N',79.99,'Be Bodywise'], ['MWBWHFP.00204.B0_N',255.48,'Be Bodywise'], ['MWBWHFP.0021.B0_N',103.95,'Be Bodywise'], ['MWBWHFP.00225.B0_N',98.86,'Be Bodywise'], ['MWBWHFP.00229.B0_N',110.08,'Be Bodywise'], ['MWBWHFP.00310.B0_N',318.93,'Be Bodywise'], ['MWBWHFP.00391.B0_N',85.74,'Be Bodywise'], ['MWBWHFP.00397.B0_N',168.14,'Be Bodywise'], ['MWBWHFP.00531.B0_N',93.07,'Be Bodywise'], ['MWBWHFP.00538.B0_N',66.9,'Be Bodywise'], ['MWBWHFP.00541.B0_N',204.2,'Be Bodywise'], ['MWBWHFP.00574.B0_N',68.46,'Be Bodywise'], ['MWBWHFP.00575.B0_N',139.64,'Be Bodywise'], ['MWBWHFP.0060.B0_N',164.31,'Be Bodywise'], ['MWBWHFP.00609.B0_N',100.05,'Be Bodywise'], ['MWBWHFP.00610.B0_N',99.89,'Be Bodywise'], ['MWBWHFP.00625.B0_N',139.18,'Be Bodywise'], ['MWBWHFP.00626.B0_N',167.27,'Be Bodywise'], ['MWBWHFP.00635.B0_N',109.96,'Be Bodywise'], ['MWBWHFP.00637.B0_N',55.41,'Be Bodywise'], ['MWBWHFP.00644.B0_N',64.32,'Be Bodywise'], ['MWBWHFP.00670.B0_N',80.88,'Be Bodywise'], ['MWBWHFP.00672.B0_N',218.38,'Be Bodywise'], ['MWBWHFP.00689.B0_N',29.84,'Be Bodywise'], ['MWBWHFP.00707.B0_N',113.74,'Be Bodywise'], ['MWBWHFP.00711.B0_N',103.4,'Be Bodywise'], ['MWBWHFP.0081.B0_N',186.6,'Be Bodywise'], ['MWBWHFS.0021.B0_N',14.38,'Be Bodywise'], ['MWBWHRP.0061.AAAA.B0_R',60.43,'Be Bodywise'], ['MWBWICP.00334.B0_N',125.19,'Be Bodywise'], ['MWBWICP.0085.B0_N',1.0,'Be Bodywise'], ['MWBWNTP.00168.B0_N',250.12,'Be Bodywise'], ['MWBWNTP.00341.B0_N',271.76,'Be Bodywise'], ['MWBWNTP.00345.B0_N',198.83,'Be Bodywise'], ['MWBWNTP.00347.B0_N',197.18,'Be Bodywise'], ['MWBWNTP.00348.B0_N',453.65,'Be Bodywise'], ['MWBWNTP.00349.B0_N',137.79,'Be Bodywise'], ['MWBWNTP.00356.B0_N',272.73,'Be Bodywise'], ['MWBWNTP.00357.B0_N',178.75,'Be Bodywise'], ['MWBWPCK.0001.B0_N',11.49,'Be Bodywise'], ['MWBWPCK.0002.B0_N',5.74,'Be Bodywise'], ['MWBWPCK.0003.B0_N',1.74,'Be Bodywise'], ['MWBWPCK.0004.B0_N',1.27,'Be Bodywise'], ['MWBWPCK.0005.B0_N',4.19,'Be Bodywise'], ['MWBWPCK.0006.B0_N',13.1,'Be Bodywise'], ['MWBWPCP.0092.B0_N',89.08,'Be Bodywise'], ['MWBWPRP.00003.B0_N',217.67,'Be Bodywise'], ['MWBWPRP.00004.B0_N',212.59,'Be Bodywise'], ['MWBWSKK.00201.B0_N',157.89,'Be Bodywise'], ['MWBWSKK.00452.B0_N',80.59,'Be Bodywise'], ['MWBWSKK.00453.B0_N',61.26,'Be Bodywise'], ['MWBWSKK.0057.B0_N',19.23,'Be Bodywise'], ['MWBWSKK.0059.B0_N',136.98,'Be Bodywise'], ['MWBWSKK.00801.B0_N',207.37,'Be Bodywise'], ['MWBWSKP.0001.B0_N',83.11,'Be Bodywise'], ['MWBWSKP.0002.B0_N',48.0,'Be Bodywise'], ['MWBWSKP.0003.B0_N',88.19,'Be Bodywise'], ['MWBWSKP.0005.B0_N',199.17,'Be Bodywise'], ['MWBWSKP.0006.B0_N',124.41,'Be Bodywise'], ['MWBWSKP.0011.B0_N',257.01,'Be Bodywise'], ['MWBWSKP.0012.B0_N',97.8,'Be Bodywise'], ['MWBWSKP.00132.B0_N',198.22,'Be Bodywise'], ['MWBWSKP.00143.B0_N',160.02,'Be Bodywise'], ['MWBWSKP.00165.B0_N',110.9,'Be Bodywise'], ['MWBWSKP.00169.B0_N',46.8,'Be Bodywise'], ['MWBWSKP.00206.B0_N',47.48,'Be Bodywise'], ['MWBWSKP.00214.B0_N',85.18,'Be Bodywise'], ['MWBWSKP.00226.B0_N',327.19,'Be Bodywise'], ['MWBWSKP.00240.B0_N',89.7,'Be Bodywise'], ['MWBWSKP.00241.B0_N',87.33,'Be Bodywise'], ['MWBWSKP.00265.B0_N',31.31,'Be Bodywise'], ['MWBWSKP.00266.B0_N',112.13,'Be Bodywise'], ['MWBWSKP.00328.B0_N',79.5,'Be Bodywise'], ['MWBWSKP.00401.B0_N',101.04,'Be Bodywise'], ['MWBWSKP.00418.B0_N',41.1,'Be Bodywise'], ['MWBWSKP.00419.B0_N',508.51,'Be Bodywise'], ['MWBWSKP.00427.B0_N',78.32,'Be Bodywise'], ['MWBWSKP.00428.B0_N',65.86,'Be Bodywise'], ['MWBWSKP.00436.B0_N',90.87,'Be Bodywise'], ['MWBWSKP.00437.B0_N',79.93,'Be Bodywise'], ['MWBWSKP.00468.B0_N',83.19,'Be Bodywise'], ['MWBWSKP.00504.B0_N',31.23,'Be Bodywise'], ['MWBWSKP.00505.B0_N',425.81,'Be Bodywise'], ['MWBWSKP.00506.B0_N',51.15,'Be Bodywise'], ['MWBWSKP.00517.B0_N',193.0,'Be Bodywise'], ['MWBWSKP.00524.B0_N',334.0,'Be Bodywise'], ['MWBWSKP.00525.B0_N',53.5,'Be Bodywise'], ['MWBWSKP.00526.B0_N',45.35,'Be Bodywise'], ['MWBWSKP.00532.B0_N',200.8,'Be Bodywise'], ['MWBWSKP.00533.B0_N',137.96,'Be Bodywise'], ['MWBWSKP.00536.B0_N',124.9,'Be Bodywise'], ['MWBWSKP.00537.B0_N',49.39,'Be Bodywise'], ['MWBWSKP.00583.B0_N',73.43,'Be Bodywise'], ['MWBWSKP.00584.B0_N',106.97,'Be Bodywise'], ['MWBWSKP.00585.B0_N',75.6,'Be Bodywise'], ['MWBWSKP.00586.B0_N',85.27,'Be Bodywise'], ['MWBWSKP.00587.B0_N',52.71,'Be Bodywise'], ['MWBWSKP.00589.B0_N',42.13,'Be Bodywise'], ['MWBWSKP.00613.B7_N',185.68,'Be Bodywise'], ['MWBWSKP.00614.B0_N',54.75,'Be Bodywise'], ['MWBWSKP.00626.B0_N',29.28,'Be Bodywise'], ['MWBWSKP.00630.B0_N',116.13,'Be Bodywise'], ['MWBWSKP.00646.B0_N',80.52,'Be Bodywise'], ['MWBWSKP.00647.B0_N',77.8,'Be Bodywise'], ['MWBWSKP.00648.B0_N',77.33,'Be Bodywise'], ['MWBWSKP.00649.B0_N',142.49,'Be Bodywise'], ['MWBWSKP.0065.B0_N',143.57,'Be Bodywise'], ['MWBWSKP.00650.B0_N',74.48,'Be Bodywise'], ['MWBWSKP.00651.B0_N',121.06,'Be Bodywise'], ['MWBWSKP.00652.B0_N',114.06,'Be Bodywise'], ['MWBWSKP.00653.B0_N',17.15,'Be Bodywise'], ['MWBWSKP.00657.B0_N',97.76,'Be Bodywise'], ['MWBWSKP.00659.B0_N',92.33,'Be Bodywise'], ['MWBWSKP.00661.B0_N',17.06,'Be Bodywise'], ['MWBWSKP.00672.B0_N',112.49,'Be Bodywise'], ['MWBWSKP.00676.B0_N',113.94,'Be Bodywise'], ['MWBWSKP.00677.B0_N',211.26,'Be Bodywise'], ['MWBWSKP.00678.B0_N',18.46,'Be Bodywise'], ['MWBWSKP.00680.B0_N',54.45,'Be Bodywise'], ['MWBWSKP.00681.B0_N',47.09,'Be Bodywise'], ['MWBWSKP.00683.B0_N',1245.16,'Be Bodywise'], ['MWBWSKP.00684.B0_N',48.56,'Be Bodywise'], ['MWBWSKP.00687.B0_N',56.04,'Be Bodywise'], ['MWBWSKP.00690.B0_N',26.74,'Be Bodywise'], ['MWBWSKP.00697.B0_N',118.94,'Be Bodywise'], ['MWBWSKP.00703.B0_N',84.8,'Be Bodywise'], ['MWBWSKP.00771.B0_N',96.28,'Be Bodywise'], ['MWBWSKP.00777.B0_N',51.15,'Be Bodywise'], ['MWBWSKP.00787.B0_N',59.38,'Be Bodywise'], ['MWBWSKP.00788.B0_N',47.03,'Be Bodywise'], ['MWBWSKP.00797.B0_N',119.05,'Be Bodywise'], ['MWBWSKP.0083.B0_N',212.77,'Be Bodywise'], ['MWBWSKS.0038.B0_N',6.46,'Be Bodywise'], ['MWBWSKS.0045.B0_N',12.53,'Be Bodywise'], ['MWBWSKS.0050.B0_N',18.33,'Be Bodywise'], ['MWBWSKS.0051.B0_N',13.82,'Be Bodywise'], ['MWBWSKS.0054.B0_N',27.14,'Be Bodywise'], ['MWBWSKS.0062.B0_N',28.08,'Be Bodywise'], ['MWBWSKS.0065.B0_N',20.21,'Be Bodywise'], ['MWBWUAEBCP.0001B0_N',46.47,'Be Bodywise'], ['MWBWUAEBCP.0002B0_N',57.48,'Be Bodywise'], ['MWBWUAEBCP.0003B0_N',48.84,'Be Bodywise'], ['MWBWUAEBCP.0004B0_N',58.08,'Be Bodywise'], ['MWBWUAEBCP.0005B0_N',52.11,'Be Bodywise'], ['MWBWUAEBCP.0006B0_N',55.52,'Be Bodywise'], ['MWBWUAEBCP.0007B0_N',55.85,'Be Bodywise'], ['MWBWUAEBCP.0008B0_N',59.54,'Be Bodywise'], ['MWBWUAEHFP.0001B0_N',120.0,'Be Bodywise'], ['MWBWUAEHFP.0002B0_N',83.95,'Be Bodywise'], ['MWBWUAENTP.0002B0_N',286.57,'Be Bodywise'], ['MWBWUAENTP.0005B0_N',204.18,'Be Bodywise'], ['MWBWUAENTP.0006B0_N',158.75,'Be Bodywise'], ['MWBWUAENTP.0007B0_N',406.34,'Be Bodywise'], ['MWBWUAENTP.0008B0_N',178.58,'Be Bodywise'], ['MWBWUAENTP.0009B0_N',214.43,'Be Bodywise'], ['MWBWUAEOCP.0001B0_N',46.0,'Other'], ['MWBWUAEOCP.0004B0_N',14.0,'Other'], ['MWBWUAEOCP.0005B0_N',28.0,'Other'], ['MWBWUAEOCP.0006B0_N',38.0,'Other'], ['MWBWUAEOCP.0007B0_N',19.0,'Other'], ['MWBWUAEOCP.0008B0_N',170.0,'Other'], ['MWBWUAESKP.0003B0_N',111.07,'Be Bodywise'], ['MWBWUAESKP.0004B0_N',81.75,'Be Bodywise'], ['MWBWUAESKP.0005B0_N',136.63,'Be Bodywise'], ['MWBWUAESKP.0006B1_N',46.46,'Be Bodywise'], ['MWBWUAESKP.0007B0_N',228.74,'Be Bodywise'], ['MWBWUAESKP.0008B0_N',106.82,'Be Bodywise'], ['MWBWUSAHFP.00001.B0_N',147.74,'Be Bodywise'], ['MWBWUSAHFP.00002.B0_N',169.29,'Be Bodywise'], ['MWBWUSAPR.00P.025_B0_N',218.98,'Be Bodywise'], ['MWBWUSAPR.00P.026_B0_N',134.25,'Be Bodywise'], ['MWBWUSAPR.00P.027_B0_N',241.5,'Be Bodywise'], ['MWBWUSAPRP.00001.B0_N',171.58,'Be Bodywise'], ['MWBWUSAPRP.00003.B0_N',216.95,'Be Bodywise'], ['MWBWUSAPRP.00022.B0_N',421.46,'Be Bodywise'], ['MWBWWMP.00122.B0_N',237.0,'Be Bodywise'], ['MWLJDCP.0001.B0_N',28.42,'Little Joys'], ['MWLJDCP.00011.B0_N',38.12,'Little Joys'], ['MWLJDCS.0001.B0_N',8.55,'Little Joys'], ['MWLJGCP.00010.B0_N',107.5,'Little Joys'], ['MWLJGCP.0005.B0_N',2.75,'Little Joys'], ['MWLJGCP.0006.B0_N',2.0,'Little Joys'], ['MWLJGCP.0007.B0_N',2.0,'Little Joys'], ['MWLJGCP.0008.B0_N',13.5,'Little Joys'], ['MWLJGCP.0009.B0_N',110.0,'Little Joys'], ['MWLJGNK.00077.B0_N',75.0,'Little Joys'], ['MWLJGNP.00022.B0_N',4.76,'Little Joys'], ['MWLJGNP.00069.B0_N',67.0,'Little Joys'], ['MWLJGNP.00531.BO_N',88.0,'Other'], ['MWLJHYP.0001.B0_N',63.57,'Little Joys'], ['MWLJHYP.0006.B0_N',72.65,'Little Joys'], ['MWLJHYP.0007.B0_N',76.88,'Little Joys'], ['MWLJNTK.00102.B0_N',287.57,'Little Joys'], ['MWLJNTK.00366.B0_N',13.4,'Little Joys'], ['MWLJNTK.00367.B0_N',129.64,'Little Joys'], ['MWLJNTK.00379.B0_N',14.16,'Little Joys'], ['MWLJNTK.00635.B0_N',16.39,'Little Joys'], ['MWLJNTP.00017.B0_N',168.34,'Little Joys'], ['MWLJNTP.00018.B0_N',61.26,'Little Joys'], ['MWLJNTP.00019.B0_N',182.34,'Little Joys'], ['MWLJNTP.0002.B0_N',98.49,'Little Joys'], ['MWLJNTP.00023.B0_N',159.74,'Little Joys'], ['MWLJNTP.00027.B0_N',151.39,'Little Joys'], ['MWLJNTP.0003.B0_N',162.55,'Little Joys'], ['MWLJNTP.00033.B0_N',283.4,'Little Joys'], ['MWLJNTP.00034.B0_N',186.74,'Little Joys'], ['MWLJNTP.00040.B0_N',116.23,'Little Joys'], ['MWLJNTP.00042.B0_N',65.83,'Little Joys'], ['MWLJNTP.00043.B0_N',107.05,'Little Joys'], ['MWLJNTP.00051.B0_N',95.86,'Little Joys'], ['MWLJNTP.00056.B0_N',232.81,'Little Joys'], ['MWLJNTP.00059.B0_N',190.25,'Little Joys'], ['MWLJNTP.00060.B0_N',104.67,'Little Joys'], ['MWLJNTP.00067.B0_N',132.36,'Little Joys'], ['MWLJNTP.0007.B0_N',95.68,'Little Joys'], ['MWLJNTP.000709.B0_N',322.07,'Little Joys'], ['MWLJNTP.000748.B0_N',127.35,'Little Joys'], ['MWLJNTP.000755.B0_N',108.45,'Little Joys'], ['MWLJNTP.000759.B0_N',204.77,'Little Joys'], ['MWLJNTP.000795.B0_N',60.38,'Little Joys'], ['MWLJNTP.000796.B0_N',8.97,'Little Joys'], ['MWLJNTP.000801.B0_N',134.03,'Little Joys'], ['MWLJNTP.000809.B0_N',140.05,'Little Joys'], ['MWLJNTP.000810.B0_N',92.95,'Little Joys'], ['MWLJNTP.000813.B0_N',162.98,'Little Joys'], ['MWLJNTP.000814.B0_N',111.81,'Little Joys'], ['MWLJNTP.000820.B0_N',57.03,'Little Joys'], ['MWLJNTP.000836.B0_N',130.34,'Little Joys'], ['MWLJNTP.00122.B0_N',151.86,'Little Joys'], ['MWLJNTP.00124.B0_N',164.72,'Little Joys'], ['MWLJNTP.00126.B0_N',213.08,'Little Joys'], ['MWLJNTP.00138.B_N',20.47,'Little Joys'], ['MWLJNTP.00153.B0_N',107.26,'Little Joys'], ['MWLJNTP.00169.B0_N',329.98,'Little Joys'], ['MWLJNTP.00177.B0_N',206.47,'Little Joys'], ['MWLJNTP.00241.B0_N',99.02,'Little Joys'], ['MWLJNTP.00248.B0_N',100.88,'Little Joys'], ['MWLJNTP.00339.B0_N',278.13,'Little Joys'], ['MWLJNTP.00370.B0_N',62.81,'Little Joys'], ['MWLJNTP.00372.B0_N',170.17,'Little Joys'], ['MWLJNTP.00380.B0_N',94.4,'Little Joys'], ['MWLJNTP.00381.B0_N',70.49,'Little Joys'], ['MWLJNTP.00406.B0_N',123.62,'Little Joys'], ['MWLJNTP.00407.B0_N',107.01,'Little Joys'], ['MWLJNTP.00423.B0_N',173.58,'Little Joys'], ['MWLJNTP.00480.B0_N',97.73,'Little Joys'], ['MWLJNTP.00481.B0_N',51.71,'Little Joys'], ['MWLJNTP.00482.B0_N',173.29,'Little Joys'], ['MWLJNTP.00483.B0_N',170.44,'Little Joys'], ['MWLJNTP.00485.B0_N',166.03,'Little Joys'], ['MWLJNTP.00500.B0_N',477.37,'Little Joys'], ['MWLJNTP.00501.B0_N',39.51,'Little Joys'], ['MWLJNTP.00507.B0_N',418.39,'Little Joys'], ['MWLJNTP.00518.B0_N',149.25,'Little Joys'], ['MWLJNTP.00519.B0_N',87.82,'Little Joys'], ['MWLJNTP.00520.B0_N',107.23,'Little Joys'], ['MWLJNTP.00527.BO_N',318.67,'Little Joys'], ['MWLJNTP.00528.B0_N',196.03,'Little Joys'], ['MWLJNTP.00529.B0_N',193.31,'Little Joys'], ['MWLJNTP.00530.B0_N',180.13,'Little Joys'], ['MWLJNTP.00531.B0_N',185.16,'Little Joys'], ['MWLJNTP.00532.B0_N',166.72,'Little Joys'], ['MWLJNTP.00533.B0_N',172.2,'Little Joys'], ['MWLJNTP.00534.B0_N',166.22,'Little Joys'], ['MWLJNTP.00535.B0_N',429.12,'Little Joys'], ['MWLJNTP.00536.B0_N',57.36,'Little Joys'], ['MWLJNTP.00541.BO_N',559.47,'Little Joys'], ['MWLJNTP.00542.BO_N',96.7,'Little Joys'], ['MWLJNTP.00548.B0_N',100.7,'Little Joys'], ['MWLJNTP.00551.BO_N',84.48,'Little Joys'], ['MWLJNTP.00553.BO_N',146.75,'Little Joys'], ['MWLJNTP.00558.B0_N',194.34,'Little Joys'], ['MWLJNTP.00560.B0_N',70.1,'Little Joys'], ['MWLJNTP.00561.B0_N',163.68,'Little Joys'], ['MWLJNTP.00562.B0_N',14.33,'Little Joys'], ['MWLJNTP.00563.B0_N',14.21,'Little Joys'], ['MWLJNTP.00571.B0_N',132.33,'Little Joys'], ['MWLJNTP.00572.B0_N',81.19,'Little Joys'], ['MWLJNTP.00574.BO_N',50.73,'Little Joys'], ['MWLJNTP.00582.B0_N',135.92,'Little Joys'], ['MWLJNTP.00584.BO_N',241.28,'Little Joys'], ['MWLJNTP.00586.BO_N',87.06,'Little Joys'], ['MWLJNTP.00591.B0_N',11.43,'Little Joys'], ['MWLJNTP.00592.B0_N',10.0,'Little Joys'], ['MWLJNTP.00603.BO_N',16.21,'Little Joys'], ['MWLJNTP.00605.BO_N',13.05,'Little Joys'], ['MWLJNTP.00607.BO_N',161.13,'Little Joys'], ['MWLJNTP.00608.BO_N',428.57,'Little Joys'], ['MWLJNTP.00609.BO_N',425.86,'Little Joys'], ['MWLJNTP.00610.BO_N',157.58,'Little Joys'], ['MWLJNTP.00615.BO_N',85.46,'Little Joys'], ['MWLJNTP.00616.BO_N',107.26,'Little Joys'], ['MWLJNTP.00617.BO_N',72.58,'Little Joys'], ['MWLJNTP.00618.BO_N',67.57,'Little Joys'], ['MWLJNTP.00636.B0_N',178.45,'Little Joys'], ['MWLJNTP.00636.BO_N',138.52,'Little Joys'], ['MWLJNTP.00660.BO_N',2.1,'Other'], ['MWLJNTP.00662.BO_N',63.0,'Other'], ['MWLJNTP.00664.B0_N',87.5,'Little Joys'], ['MWLJNTP.00664.BO_N',242.71,'Little Joys'], ['MWLJNTP.00667.B0_N',428.25,'Little Joys'], ['MWLJNTP.00668.B0_N',387.51,'Little Joys'], ['MWLJNTP.00676.B0_N',8.73,'Little Joys'], ['MWLJNTP.00677.BO_N',2.38,'Little Joys'], ['MWLJNTP.00678.B0_N',5.2,'Little Joys'], ['MWLJNTP.00687.B0_N',216.8,'Little Joys'], ['MWLJNTP.00690.BO_N',1.53,'Little Joys'], ['MWLJNTP.00696.B0_N',150.81,'Little Joys'], ['MWLJNTP.00697.B0_N',79.44,'Little Joys'], ['MWLJNTP.00698.B0_N',164.68,'Little Joys'], ['MWLJNTP.00699.B0_N',295.79,'Little Joys'], ['MWLJNTP.00700.B0_N',317.56,'Little Joys'], ['MWLJNTP.00736.BO_N',1.0,'Little Joys'], ['MWLJNTS.0001.B0_N',14.32,'Little Joys'], ['MWLJNTS.00016.B0_N',12.39,'Little Joys'], ['MWLJNTS.00018.B0_N',14.48,'Little Joys'], ['MWLJNTS.0002.B0_N',12.62,'Little Joys'], ['MWLJNTS.00021.B0_N',14.25,'Little Joys'], ['MWLJNTS.00022.B0_N',12.89,'Little Joys'], ['MWLJNTS.0003.B0_N',14.16,'Little Joys'], ['MWLJNTS.00031.B0_N',21.0,'Little Joys'], ['MWLJNTS.00040.B0_N',15.07,'Little Joys'], ['MWLJNTS.00041.B0_N',20.04,'Little Joys'], ['MWLJNTS.00043.B0_N',12.7,'Little Joys'], ['MWLJNTS.00056.B0_N',16.67,'Little Joys'], ['MWLJNTS.00057.B0_N',16.66,'Little Joys'], ['MWLJNTS.00058.B0_N',15.3,'Little Joys'], ['MWLJNTS.00059.B0_N',15.74,'Little Joys'], ['MWLJNTS.0006.BO_N',18.53,'Little Joys'], ['MWLJNTS.00060.B0_N',20.25,'Little Joys'], ['MWLJNTS.00061.B0_N',20.27,'Little Joys'], ['MWLJNTS.00062.B0_N',19.71,'Little Joys'], ['MWLJNTS.00063.B0_N',19.09,'Little Joys'], ['MWLJNTS.00064.B0_N',17.87,'Little Joys'], ['MWLJNTS.0008.B0_N',13.86,'Little Joys'], ['MWLJPCK.0001.B0_N',20.51,'Little Joys'], ['MWLJPCK.0002.B0_N',8.17,'Little Joys'], ['MWLJPCK.0004.B0_N',1.37,'Little Joys'], ['MWLJPCK.0005.B0_N',7.09,'Little Joys'], ['MWLJPCK.0006.B0_N',29.55,'Little Joys'], ['MWLJPCK.0008.B0_N',15.32,'Little Joys'], ['MWLJPCP.0003.B0_N',140.46,'Little Joys'], ['MWLJSKP.0002.B0_N',62.68,'Little Joys'], ['MWLJSKP.0003.B0_N',61.5,'Little Joys'], ['MWLJSKP.0007.B0_N',63.04,'Little Joys'], ['MWLJSKP.0008.B0_N',55.0,'Little Joys'], ['MWLJSKP.0034.B0_N',96.03,'Little Joys'], ['MWLJSKS.0001.B0_N',13.73,'Little Joys'], ['MWLJUAEOC.0001.B0_N',4.0,'Other'], ['MWLJUAEOC.0002.B0_N',37.0,'Other'], ['MWLJUAEOC.0003.B0_N',37.0,'Other'], ['MWLJUAEOC.0004.B0_N',37.0,'Other'], ['MWLJUAEOC.0005.B0_N',37.0,'Other'], ['MWLJUAEOC.0006.B0_N',37.0,'Other'], ['MWLJUAEOC.0007.B0_N',37.0,'Other'], ['MWLJUAEOC.0008.B0_N',37.0,'Other'], ['MWLJUAEP.0001.B0_N',103.48,'Little Joys'], ['MWLJUAEP.00018.B0_N',182.41,'Little Joys'], ['MWLJUAEP.00019.B0_N',196.94,'Little Joys'], ['MWLJUAEP.0002.B0_N',93.3,'Little Joys'], ['MWLJUAEP.00023.B0_N',161.81,'Little Joys'], ['MWLJUAEP.00025.B0_N',18.59,'Little Joys'], ['MWLJUAEP.00026.B0_N',19.53,'Little Joys'], ['MWLJUAEP.00028.B0_N',41.34,'Little Joys'], ['MWLJUAEP.00029.B0_N',63.42,'Little Joys'], ['MWLJUAEP.00031.B0_N',458.18,'Little Joys'], ['MWLJUAEP.00033.B0_N',106.08,'Little Joys'], ['MWLJUAEP.00037.B0_N',15.34,'Little Joys'], ['MWLJUAEP.0004.B0_N',98.4,'Little Joys'], ['MWLJUAEP.00041.B0_N',47.37,'Little Joys'], ['MWLJUAEP.00044.B0_N',15.16,'Little Joys'], ['MWLJUAEP.00045.B0_N',78.01,'Little Joys'], ['MWLJUAEP.00047.B0_N',126.1,'Little Joys'], ['MWLJUAEP.00049.B0_N',88.0,'Little Joys'], ['MWLJUAEP.00051.B0_N',91.64,'Little Joys'], ['MWLJUAEP.00052.B0_N',198.55,'Little Joys'], ['MWLJUAEP.00054.B0_N',248.39,'Little Joys'], ['MWLJUAEP.00055.B0_N',159.66,'Little Joys'], ['MWLJUAEP.00056.B0_N',160.61,'Little Joys'], ['MWLJUAEP.00057.B0_N',177.0,'Little Joys'], ['MWLJUAEP.00058.B0_N',168.72,'Little Joys'], ['MWLJUAEP.0008.B0_N',184.57,'Little Joys'], ['MWLJUSANTP.00001.B0_N',88.28,'Little Joys'], ['MWLJUSANTP.00002.B0_N',89.48,'Little Joys'], ['MWMMACK.0008.AAAA.B0_N',0.9,'Man Matters'], ['MWMMACK.0009.AAAA.B0_N',0.9,'Man Matters'], ['MWMMBDK.0280.AAAA.B0_N',60.0,'Man Matters'], ['MWMMBDP.0001.AAAA.B0_N',53.13,'Man Matters'], ['MWMMBDP.0003.AAAA.B0_N',87.43,'Man Matters'], ['MWMMBDP.0005.AAAA.B0_N',70.88,'Man Matters'], ['MWMMBDP.0006.AAAA.B0_N',86.64,'Man Matters'], ['MWMMBDP.0128.AAAA.B0_R',97.55,'Man Matters'], ['MWMMBDP.0132.AAAA.B0_R',70.45,'Man Matters'], ['MWMMHRK.6357.AAAABO_N',255.57,'Man Matters'], ['MWMMHRK.6520.AAAA.B0_N',219.79,'Man Matters'], ['MWMMHRP.0001.AAAA.B0_N',68.48,'Man Matters'], ['MWMMHRP.0002.AAAA.B0_N',75.39,'Man Matters'], ['MWMMHRP.0003.AAAA.B0_N',66.6,'Man Matters'], ['MWMMHRP.0004.AAAA.B0_N',85.3,'Man Matters'], ['MWMMHRP.0005.AAAA.B0_N',193.06,'Man Matters'], ['MWMMHRP.0006.AAAA.B0_R',118.17,'Man Matters'], ['MWMMHRP.0008.AAAA.B0_R',85.08,'Man Matters'], ['MWMMHRP.0009.AAAA.B0_R',54.94,'Man Matters'], ['MWMMHRP.0010.AAAA.B0_N',146.4,'Man Matters'], ['MWMMHRP.0010.AAAA.B0_R',60.51,'Man Matters'], ['MWMMHRP.0012.AAAA.B0_N',101.29,'Man Matters'], ['MWMMHRP.0013.AAAA.B0_N',113.63,'Man Matters'], ['MWMMHRP.0014.AAAA.B0_N',74.98,'Man Matters'], ['MWMMHRP.0015.AAAA.B0_N',98.92,'Man Matters'], ['MWMMHRP.0017.AAAA.B0_N',82.55,'Man Matters'], ['MWMMHRP.0018.AAAA.B0_N',46.82,'Man Matters'], ['MWMMHRP.0020.AAAA.B0_N',225.27,'Man Matters'], ['MWMMHRP.0021.AAAA.B0_R',179.98,'Man Matters'], ['MWMMHRP.1001.AAAA.B0_N',56.36,'Man Matters'], ['MWMMHRP.1002.AAAA.B0_N',253.33,'Man Matters'], ['MWMMHRP.1003.AAAA.B0_N',60.87,'Man Matters'], ['MWMMHRP.2050.AAAA.B0_N',68.06,'Man Matters'], ['MWMMHRP.2055.AAAA.B0_N',78.53,'Man Matters'], ['MWMMHRP.6171.AAAA.B0_N',72.17,'Man Matters'], ['MWMMHRP.6190.AAAA.B0_N',212.99,'Man Matters'], ['MWMMHRP.6198.AAAA.B0_N',80.97,'Man Matters'], ['MWMMHRP.6226.AAAA.B0_N',138.77,'Man Matters'], ['MWMMHRP.6286.AAAA.B0_N',68.53,'Man Matters'], ['MWMMHRP.6298.AAAA.B0_N',122.21,'Man Matters'], ['MWMMHRP.6337.AAAA.B0_N',26.91,'Man Matters'], ['MWMMHRP.6367.AAAABO_N',0.92,'Man Matters'], ['MWMMHRP.6368.AAAABO_N',0.92,'Man Matters'], ['MWMMHRP.6450.AAAA.B0_N',101.97,'Man Matters'], ['MWMMHRP.6474.AAAA.B0_N',128.33,'Man Matters'], ['MWMMHRP.6483.AAAA.B0_N',111.65,'Man Matters'], ['MWMMHRP.6533.AAAA.B0_R',189.0,'Man Matters'], ['MWMMHRP.6622.B0_R',129.46,'Man Matters'], ['MWMMHRP.6662.B0_N',74.02,'Man Matters'], ['MWMMHRP.6663.B0_N',137.89,'Man Matters'], ['MWMMHRP.7030.B0_N',133.37,'Man Matters'], ['MWMMHRP.7031.B0_N',59.0,'Man Matters'], ['MWMMHRP.7044.B0_N',116.0,'Man Matters'], ['MWMMHRP.7106.B0_R',207.46,'Man Matters'], ['MWMMHRP.7121.B0_R',145.64,'Man Matters'], ['MWMMHRS.0009.AAAA.B0_N',11.78,'Man Matters'], ['MWMMHRS.0017.AAAA.B0_N',11.23,'Man Matters'], ['MWMMHRS.0018.AAAA.B0_N',15.18,'Man Matters'], ['MWMMHTP.0001.AAAA.B0_N',67.64,'Man Matters'], ['MWMMHTP.0005.AAAA.B0_N',17.91,'Man Matters'], ['MWMMHTP.0006.AAAA.B0_N',96.5,'Man Matters'], ['MWMMHTP.0127.AAAA.B0_N',76.69,'Man Matters'], ['MWMMHTS.1003.AAAA.B0_N',13.95,'Man Matters'], ['MWMMNSK.0005.B1_R',134.88,'Man Matters'], ['MWMMNTK.0059.AAAA.B0_N',156.22,'Man Matters'], ['MWMMNTK.0129.AAAA.B0_N',270.54,'Man Matters'], ['MWMMNTK.0141.AAAA.B0_N',673.16,'Man Matters'], ['MWMMNTP.000172.AAAAB0_N',266.63,'Man Matters'], ['MWMMNTP.000174.AAAAB0_N',315.31,'Man Matters'], ['MWMMNTP.000175.AAAAB0_N',80.86,'Man Matters'], ['MWMMNTP.000176.AAAAB0_N',453.45,'Man Matters'], ['MWMMNTP.000186.AAAAB0_N',567.26,'Man Matters'], ['MWMMNTP.000187.AAAAB0_N',527.74,'Man Matters'], ['MWMMNTP.000188.AAAAB0_N',101.54,'Man Matters'], ['MWMMNTP.000191.AAAAB0_N',118.75,'Man Matters'], ['MWMMNTP.0002.AAAA.B0_N',507.44,'Man Matters'], ['MWMMNTP.0003.AAAA.B0_N',205.82,'Man Matters'], ['MWMMNTP.0004.AAAA.B0_N',130.34,'Man Matters'], ['MWMMNTP.00205.AAAA.B0_N',130.46,'Man Matters'], ['MWMMNTP.00207.AAAA.B0_N',234.73,'Man Matters'], ['MWMMNTP.00208.AAAA.B0_N',301.26,'Man Matters'], ['MWMMNTP.00210.AAAA.B0_N',1096.0,'Man Matters'], ['MWMMNTP.00211.AAAA.B0_N',185.0,'Man Matters'], ['MWMMNTP.0035.AAAABO_N',194.12,'Man Matters'], ['MWMMNTP.0040.AAAA.B0_N',107.0,'Man Matters'], ['MWMMNTP.0072.AAAA.B0_N',217.28,'Man Matters'], ['MWMMNTP.0073.AAAA.B0_N',227.58,'Man Matters'], ['MWMMNTP.0105.AAAA.B0_N',61.16,'Man Matters'], ['MWMMNTP.0110.AAAA.B0_N',49.86,'Man Matters'], ['MWMMNTP.0147.AAAA.B0_N',18.18,'Man Matters'], ['MWMMNTP.0148.AAAA.B0_N',26.56,'Man Matters'], ['MWMMNTP.0149.AAAA.B0_N',77.48,'Man Matters'], ['MWMMNTP.0151.AAAA.B0_N',84.98,'Man Matters'], ['MWMMNTP.0169.AAAA.B0_N',256.57,'Man Matters'], ['MWMMNTP.0170.AAAA.B0_N',1159.82,'Man Matters'], ['MWMMNTP.0171.AAAA.B0_N',214.06,'Man Matters'], ['MWMMNTP.6345.AAAABO_N',109.8,'Man Matters'], ['MWMMNTP.6346.AAAABO_N',95.03,'Man Matters'], ['MWMMNTP.6348.AAAABO_N',188.19,'Man Matters'], ['MWMMNTP.6349.AAAABO_N',216.0,'Man Matters'], ['MWMMNTP.6356.AAAABO_N',194.63,'Man Matters'], ['MWMMNTP.6369.AAAABO_N',140.07,'Man Matters'], ['MWMMNTP.6372.AAAABO_N',550.0,'Man Matters'], ['MWMMNTS.0032.AAAA.B0_N',37.62,'Man Matters'], ['MWMMNTS.0034.AAAA.B0_N',65.39,'Man Matters'], ['MWMMNTS.0035.AAAA.B0_N',32.33,'Man Matters'], ['MWMMOCP.0029.B0_N',600.0,'Man Matters'], ['MWMMPCK.0001.AAAA.B0_N',12.83,'Man Matters'], ['MWMMPCK.0002.AAAA.B0_N',10.39,'Man Matters'], ['MWMMPCK.0003.AAAA.B0_N',5.65,'Man Matters'], ['MWMMPCK.0004.AAAA.B0_N',4.45,'Man Matters'], ['MWMMPCK.0005.AAAA.B0_N',2.07,'Man Matters'], ['MWMMPCK.0006.AAAA.B0_N',2.47,'Man Matters'], ['MWMMPCK.0007.AAAA.B0_N',1.02,'Man Matters'], ['MWMMPCK.0008.AAAA.B0_N',1.29,'Man Matters'], ['MWMMPCK.0009.AAAA.B0_N',4.06,'Man Matters'], ['MWMMPCK.0010.AAAA.B0_N',28.78,'Man Matters'], ['MWMMPCK.0015.AAAA.B0_N',3.5,'Man Matters'], ['MWMMPCK.0016.AAAA.B0_N',4.45,'Man Matters'], ['MWMMPCK.0017.AAAA.B0_N',3.72,'Man Matters'], ['MWMMPCK.0018.AAAA.B0_N',5.15,'Man Matters'], ['MWMMPRK.2026.AAAA.B0_N',128.01,'Man Matters'], ['MWMMPRK.2097.B0_N',213.74,'Man Matters'], ['MWMMPRP.0008.AAAA.B0_R',9.67,'Man Matters'], ['MWMMPRP.0009.AAAA.B0_N',91.07,'Man Matters'], ['MWMMPRP.0010.AAAA.B0_N',88.7,'Man Matters'], ['MWMMPRP.0010.AAAA.B0_NTEST',99.6,'Man Matters'], ['MWMMPRP.0040.AAAA.B0_N',272.67,'Man Matters'], ['MWMMPRP.1001.AAAA.B0_N',156.97,'Man Matters'], ['MWMMPRP.2017.AAAA.B0_N',193.4,'Man Matters'], ['MWMMPRP.2018.AAAA.B0_N',116.5,'Man Matters'], ['MWMMPRP.2020.AAAA.B0_N',234.93,'Man Matters'], ['MWMMPRP.2022.AAAA.B0_N',61.25,'Man Matters'], ['MWMMPRP.2032.AAAA.B0_N',29.0,'Man Matters'], ['MWMMPRP.2040.AAAA.B0_N',28.14,'Man Matters'], ['MWMMPRP.2092.B0_N',107.37,'Man Matters'], ['MWMMSKP.5002.AAAA.B0_N',72.71,'Man Matters'], ['MWMMSKP.5003.AAAA.B0_N',60.34,'Man Matters'], ['MWMMSKP.5005.AAAA.B0_N',34.28,'Man Matters'], ['MWMMSKP.5006.AAAA.B0_N',144.3,'Man Matters'], ['MWMMSKP.5007.AAAA.B0_N',80.08,'Man Matters'], ['MWMMSKP.5012.AAAA.B0_N',44.88,'Man Matters'], ['MWMMSKP.5049.AAAA.B0_N',50.69,'Man Matters'], ['MWMMSKP.5059.AAAA.B0_N',76.03,'Man Matters'], ['MWMMSKP.5061.AAAA.B0_N',78.87,'Man Matters'], ['MWMMSKP.5062.AAAA.B0_N',18.11,'Man Matters'], ['MWMMSKP.5063.AAAA.B0_N',108.97,'Man Matters'], ['MWMMSMP.4004.AAAA.B0_N',90.07,'Man Matters'], ['MWRLUSAPRK.00001.B0_N',230.24,'Root Labs'], ['MWRLUSAPRK.00004.B0_N',213.37,'Root Labs'], ['MWRLUSAPRK.00005.B0_N',240.74,'Root Labs'], ['MWRLUSAPRK.00006.B0_N',437.61,'Root Labs'], ['MWRLUSAPRP.00007.B0_N',373.82,'Root Labs'], ['MWRLUSAPRP.00010.B0_N',235.22,'Root Labs'], ['MWRLUSAPRP.00013.B0_N',237.85,'Root Labs'], ['MWRLUSAPRP.00014.B0_N',440.03,'Root Labs'], ['MWRLUSAPRP.00021.B0_N',344.62,'Root Labs'], ['MWSSUSAPRP.00010.B0_N',341.23,'STAY STEADY'], ['MWSSUSAPRP.0008.B0_N',306.32,'STAY STEADY'], ['OWNAPP.0001',899.05,'OWN'], ['OWNAPP.00010',0.62,'OWN'], ['OWNAPP.00011',1.9,'Other'], ['OWNAPP.00012',1574.93,'OWN'], ['OWNAPP.00013',244.0,'OWN'], ['OWNAPP.00015',1774.24,'OWN'], ['OWNAPP.00016',7.48,'OWN'], ['OWNAPP.00017',3.5,'OWN'], ['OWNAPP.00018',655.88,'OWN'], ['OWNAPP.00019',1593.14,'OWN'], ['OWNAPP.0002',13.56,'OWN'], ['OWNAPP.00020',1363.44,'OWN'], ['OWNAPP.00021',314.5,'OWN'], ['OWNAPP.00023',4.88,'OWN'], ['OWNAPP.00024',5.5,'OWN'], ['OWNAPP.00025',0.68,'OWN'], ['OWNAPP.00026',26.0,'OWN'], ['OWNAPP.00027',0.75,'OWN'], ['OWNAPP.00028',2.24,'OWN'], ['OWNAPP.0003',15.53,'OWN'], ['OWNAPP.00031',0.6,'OWN'], ['OWNAPP.00032',0.6,'OWN'], ['OWNAPP.00034',4.3,'OWN'], ['OWNAPP.00035',4.3,'OWN'], ['OWNAPP.00036',1.07,'OWN'], ['OWNAPP.00037',4.3,'OWN'], ['OWNAPP.0004',5.88,'OWN'], ['OWNAPP.00040',4.5,'OWN'], ['OWNAPP.00041',2127.0,'OWN'], ['OWNAPP.00042',4.3,'OWN'], ['OWNAPP.00043',0.6,'OWN'], ['OWNAPP.00046',2.14,'OWN'], ['OWNAPP.00047',0.6,'OWN'], ['OWNAPP.0005',0.62,'OWN'], ['OWNAPP.0006',0.62,'OWN'], ['OWNAPP.0007',4.97,'OWN'], ['OWNAPP.0008',0.85,'OWN'], ['OWNAPP.0009',5.24,'OWN'], ['OWNAPP.001',877.04,'Other'], ['OWNAPRM.00014',755.0,'OWN'], ['Own_Big_bag',5.9,'Other'], ['PBTGN2',2.64,'Other'], ['PBTGN35',20.5,'Other'], ['PCAGN11',2.78,'Other'], ['PCAGN12',10.0,'Other'], ['PCAGN9',1.15,'Man Matters'], ['PCBGN4',20.0,'Little Joys'], ['PCBGN5',19.0,'Little Joys'], ['POBBB10',7.5,'Other'], ['POBBB12',21.5,'Be Bodywise'], ['POBBB9',4.56,'Other'], ['POBLJ10LJ',30.0,'Other'], ['POBUAEBB1',25.88,'Other'], ['POBUAELJ1',38.5,'Other'], ['POBUAELJ10',10.0,'Other'], ['POBUAELJ11',10.0,'Other'], ['POBUAELJ12',10.0,'Other'], ['POBUAELJ13',56.0,'Other'], ['POBUAELJ14',30.5,'Other'], ['POBUAELJ15',11.0,'Other'], ['POBUAELJ16',10.0,'Other'], ['POBUAELJ17',10.0,'Other'], ['POBUAELJ2',39.5,'Other'], ['POBUAELJ3',15.52,'Other'], ['POBUAELJ4',15.52,'Other'], ['POBUAELJ5',15.52,'Other'], ['POBUAELJ6',40.0,'Other'], ['POBUAELJ7',15.0,'Other'], ['POBUAELJ8',39.5,'Other'], ['POBUAELJ9',40.0,'Other'], ['POIGN18',49.31,'Man Matters'], ['POIGN19',48.69,'Be Bodywise'], ['POIGN37',48.41,'Little Joys'], ['POIGN44',39.46,'Other'], ['POIGN66',39.25,'Other'], ['POIGN69',405.0,'Other'], ['POIGN70',66.5,'Other'], ['POIGN71',40.83,'Packing Material'], ['POIGN73',3.36,'Man Matters'], ['POIGN74',3.59,'Man Matters'], ['POIGN75',3.35,'Little Joys'], ['POIGN76',3.56,'Little Joys'], ['POIGN77',3.35,'Be Bodywise'], ['POIGN78',3.56,'Be Bodywise'], ['PPUGN1',6.5,'Other'], ['PPUGN17',9.0,'Be Bodywise'], ['PPUGN18',10.0,'Be Bodywise'], ['PPUGN2',7.0,'Other'], ['RTV_box_1',35.0,'Other'], ['RTV_box_2',47.0,'Other'], ['Sample_Littlejoys',1.0,'Other'], ['Sample_Manmatters',1.0,'Other'], ['testsku',1.0,'Other'] ].map(r =>
[r[0],'',r[1],r[2],'GRN']);
sh.getRange(2,1,rows.length,5).setValues(rows);
sh.autoResizeColumns(1,5);
Logger.log('createCOGSLookupSheet_: created ' + rows.length + ' rows.');
SpreadsheetApp.flush();
}
// ------------------------------------------------------------------------------
// MONTH TRANSITION - auto-create new monthly sheet when month rolls over
// ------------------------------------------------------------------------------
function autoTransitionMonth() {
const props = PropertiesService.getScriptProperties();
const tz = Session.getScriptTimeZone();
const today = new Date();
const currentYM = Utilities.formatDate(today, tz, 'yyyy-MM');
const lastRunYM = props.getProperty('LAST_RUN_MONTH') || '';
if (lastRunYM === currentYM)
return false;
// same month, no transition needed
// First run of a new month Logger.log('autoTransitionMonth_: new month detected (' + lastRunYM + ' → ' + currentYM + ')');
const monthLabel = Utilities.formatDate(today, tz, 'MMMM yyyy');
const newSSName = 'Mosaic Inventory Impact Dashboard - ' + monthLabel;
// Create new spreadsheet
const newSS = SpreadsheetApp.create(newSSName);
const newId = newSS.getId();
// Copy NI_Events header row to prime the new sheet
const oldSS = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const oldEv = oldSS.getSheetByName('NI_Events');
if (oldEv) {
const hdr = oldEv.getRange(1,1,1,oldEv.getLastColumn()).getValues();
const newEv = newSS.insertSheet('NI_Events');
newEv.getRange(1,1,1,hdr[0].length).setValues(hdr);
newEv.getRange(1,1,1,hdr[0].length).setFontWeight('bold');
newEv.setFrozenRows(1);
newSS.deleteSheet(newSS.getSheets()[0]);
// remove default 'Sheet1'
}
// Update script property to point to new sheet
props.setProperty('ACTIVE_SHEET_ID', newId);
props.setProperty('LAST_RUN_MONTH', currentYM);
// Email notification
try {
MailApp.sendEmail({
to: Session.getActiveUser().getEmail(), subject: ' 📅 NI Dashboard: New sheet created for ' + monthLabel, body: 'A new inventory dashboard sheet has been created for ' + monthLabel + '.\n\n' + 'Sheet: ' + newSSName + '\n' + 'URL: https://docs.google.com/spreadsheets/d/' + newId + '\n\n' + 'Update NI_CONFIG.SHEET_ID in the script to: ' + newId + '\n' + '(Or set it dynamically via Script Properties → ACTIVE_SHEET_ID)',
});
} catch(e) {
Logger.log('Email notification failed: ' + e);
} Logger.log('autoTransitionMonth_: new sheet created → ' + newId);
return true;
}
// ============================================================
// NI_FacHistory - daily per-facility impact log
// Schema: Date | Facility | City | BizType | NegQty | NegCOGS | PosQty | PosCOGS | NetCOGS
// ============================================================
function getFacHistorySheet_() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh = ss.getSheetByName('NI_FacHistory');
if (!sh) {
sh = ss.insertSheet('NI_FacHistory');
const h = [['Date','Facility','City','BizType','NegQty','NegCOGS','PosQty','PosCOGS','NetCOGS']];
sh.getRange(1,1,1,9).setValues(h).setFontWeight('bold');
sh.setFrozenRows(1);
Logger.log('NI_FacHistory sheet created.');
}
return sh;
}
function appendFacHistory_(result) {
if (!result.facRanked || !result.facRanked.length) return;
const sh = getFacHistorySheet_();
const dateStr = result.todayStr;
// Deduplicate: skip if this date+facility already logged
const existingKeys = new Set();
if (sh.getLastRow() >
1) {
sh.getRange(2,1,sh.getLastRow()-1,2).getValues() .forEach(r =>
existingKeys.add(String(r[0]).trim()+'||'+String(r[1]).trim()));
}
const rows = [];
result.facRanked.forEach(f =>
{
const key = dateStr+'||'+f.name;
if (existingKeys.has(key)) return;
rows.push([ dateStr, f.name, f.city||'', f.bt||'', f.total||0, Math.round((f.totalVal||0)*100)/100, f.posQty||0, Math.round((f.posVal||0)*100)/100, Math.round((f.netVal||0)*100)/100 ]);
});
if (rows.length) {
sh.getRange(sh.getLastRow()+1, 1, rows.length, 9).setValues(rows);
SpreadsheetApp.flush();
Logger.log('appendFacHistory_: wrote ' + rows.length + ' facility rows for ' + dateStr);
}
}
// ============================================================
// NI_DailyPNL - daily P&L per brand
// Schema: Date | Brand | NegEvents | NegQty | NegCOGS | PosEvents | PosQty | PosCOGS | NetCOGS | ExpiryQty | ExpiryCOGS
// ExpiryQty/ExpiryCOGS = a2ne+ne2e+a2e (informational, not in Net)
// ============================================================
function getDailyPNLSheet_() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
let sh = ss.getSheetByName('NI_DailyPNL');
if (!sh) {
sh = ss.insertSheet('NI_DailyPNL');
const h = [['Date','Brand','NegEvents','NegQty','NegCOGS', 'PosEvents','PosQty','PosCOGS','NetCOGS', 'ExpiryQty','ExpiryCOGS']];
sh.getRange(1,1,1,11).setValues(h).setFontWeight('bold');
sh.setFrozenRows(1);
Logger.log('NI_DailyPNL sheet created.');
}
return sh;
}
function appendDailyPNL_(result) {
const sh = getDailyPNLSheet_();
const dateStr = result.todayStr;
// Deduplicate by date+brand
const existingKeys = new Set();
if (sh.getLastRow() >
1) {
sh.getRange(2,1,sh.getLastRow()-1,2).getValues() .forEach(r =>
existingKeys.add(String(r[0]).trim()+'||'+String(r[1]).trim()));
}
// Aggregate per brand across all actionable neg categories
const byBrand = {};
function addToBrand(arr, type) {
arr.forEach(x =>
{
const brand = getBrandFromSKU_(x.sku||'') || 'Other';
if (!byBrand[brand]) byBrand[brand] = {negEv:0,negQty:0,negCOGS:0,posEv:0,posQty:0,posCOGS:0,expQty:0,expCOGS:0};
const b = byBrand[brand];
if (type==='neg') {
b.negEv++;
b.negQty+=x.qty||0;
b.negCOGS+=x.cogsVal||0;
} else
if (type==='pos'){
b.posEv++;
b.posQty+=x.qty||0;
b.posCOGS+=x.cogsVal||0;
} else
if (type==='exp'){
b.expQty+=x.qty||0;
b.expCOGS+=x.cogsVal||0;
}
});
}
// Route each neg event by stateFrom (same rule as getImpactClass_)
// stateFrom=Active or '' (newBad/newQC GRN) - Financial Loss - neg bucket (drives KPIs)
// stateFrom=About_to_expire or Recalled - Expiry Risk - exp bucket (informational only)
Object.keys(result.neg).forEach(cat =>
{
(result.neg[cat] || []).forEach(x =>
{
const sf = x.sF || x.stateFrom || '';
if (sf === 'Active' || sf === '') addToBrand([x], 'neg');
else addToBrand([x], 'exp');
});
});
// Positives
;[...(result.pos.b2g||[]),...(result.pos.q2g||[]),...(result.pos.rc2a||[])].forEach(x =>
{
const brand = getBrandFromSKU_(x.sku||'') || 'Other';
if (!byBrand[brand]) byBrand[brand] = {negEv:0,negQty:0,negCOGS:0,posEv:0,posQty:0,posCOGS:0,expQty:0,expCOGS:0};
byBrand[brand].posEv++;
byBrand[brand].posQty+=x.qty||0;
byBrand[brand].posCOGS+=x.cogsVal||0;
});
const rows = [];
Object.keys(byBrand).sort().forEach(brand =>
{
const key = dateStr+'||'+brand;
if (existingKeys.has(key)) return;
const b = byBrand[brand];
const netCOGS = Math.round((b.negCOGS - b.posCOGS)*100)/100;
rows.push([ dateStr, brand, b.negEv, b.negQty, Math.round(b.negCOGS*100)/100, b.posEv, b.posQty, Math.round(b.posCOGS*100)/100, netCOGS, b.expQty, Math.round(b.expCOGS*100)/100 ]);
});
if (rows.length) {
sh.getRange(sh.getLastRow()+1, 1, rows.length, 11).setValues(rows);
SpreadsheetApp.flush();
Logger.log('appendDailyPNL_: wrote ' + rows.length + ' brand rows for ' + dateStr);
}
}
// Keep appendEventHistory_ as alias for backward compatibility
function appendEventHistory_(result, dateStr) {
return appendDailyTop5_(result, dateStr);
}
// One-time backfill: create NI_EventHistory rows from existing NI_Remarks
// Run this once manually after deploying
function backfillEventHistoryFromRemarks() {
const rmkSh = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID).getSheetByName('NI_Remarks');
if (!rmkSh || rmkSh.getLastRow() <
2) {
Logger.log('No remarks to backfill from.');
return;
}
const data = rmkSh.getDataRange().getValues();
const h = data[0];
const idx = {
id:h.indexOf('ID'), date:h.indexOf('Date'), sku:h.indexOf('SKU'), batch:h.indexOf('Batch'), fac:h.indexOf('Facility'), bt:h.indexOf('Business Type'), cogs:h.indexOf('COGS Value'), ev:h.indexOf('Event')
};
const sh = getEventHistorySheet_();
const existingIds = new Set();
if (sh.getLastRow() >
1) {
sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues() .forEach(r =>
existingIds.add(String(r[0]).trim()));
}
const today = new Date().toLocaleDateString('en-IN');
const rows = [];
data.slice(1).forEach((row, i) =>
{
const dateStr = String(row[idx.date]||'').trim();
const sku = String(row[idx.sku]||'').trim();
const batch = String(row[idx.batch]||'').trim();
const fac = String(row[idx.fac]||'').trim();
const ev = String(row[idx.ev]||'').trim();
const bt = String(row[idx.bt]||'').trim();
const cogs = parseFloat(row[idx.cogs])||0;
if (!sku || !dateStr) return;
const ehId = makeEhId_(dateStr, sku, batch, fac, ev);
if (existingIds.has(ehId)) return;
existingIds.add(ehId);
rows.push([ehId, dateStr, sku, '', batch, fac, '', bt, ev, 0, cogs, 99, today]);
});
if (rows.length >
0) {
sh.getRange(sh.getLastRow()+1, 1, rows.length, 13).setValues(rows);
SpreadsheetApp.flush();
Logger.log('backfillEventHistoryFromRemarks: added ' + rows.length + ' rows.');
} else {
Logger.log('backfillEventHistoryFromRemarks: nothing to add.');
}
}
// ============================================================
// TRIGGER
// ============================================================
function setNegativeImpactTrigger() {
ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='runDailyNegativeImpactReport') ScriptApp.deleteTrigger(t);});
ScriptApp.newTrigger('runDailyNegativeImpactReport').timeBased().atHour(NI_CONFIG.REPORT_HOUR).nearMinute(NI_CONFIG.REPORT_MINUTE).everyDays(1).inTimezone('Asia/Kolkata').create();
Logger.log('Trigger set: '+NI_CONFIG.REPORT_HOUR+':00 IST daily');
}
// ============================================================
// MONTHLY ARCHIVE - runs on 1st of every month at 7 AM IST
// Archives: NI_History, NI_FacHistory, NI_EventHistory, NI_Remarks
// Archive sheet names: e.g. NI_History_Apr2026
// Clears main sheets after archiving (keeps header row)
// ============================================================
function archiveMonthlyData() {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const now = new Date();
// Archive label = previous month (since this runs on 1st of current month)
const archiveDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const monthLabel = Utilities.formatDate(archiveDate, 'Asia/Kolkata', 'MMM yyyy') .replace(' ', '');
// e.g. "Apr2026"
const SHEETS_TO_ARCHIVE = [ 'NI_History', 'NI_FacHistory', 'NI_DailyTop5', 'NI_Remarks', ];
const results = [];
SHEETS_TO_ARCHIVE.forEach(sheetName =>
{
const sh = ss.getSheetByName(sheetName);
if (!sh) {
Logger.log('archiveMonthlyData: ' + sheetName + ' not found — skipping');
results.push({
sheet: sheetName, status: 'NOT FOUND'
});
return;
}
if (sh.getLastRow() <
2) {
Logger.log('archiveMonthlyData: ' + sheetName + ' has no data rows — skipping');
results.push({
sheet: sheetName, status: 'EMPTY'
});
return;
}
const archiveName = sheetName + '_' + monthLabel;
// -- Delete old archive with same name if exists --
const existing = ss.getSheetByName(archiveName);
if (existing) ss.deleteSheet(existing);
// -- Duplicate sheet - rename as archive --
const archived = sh.copyTo(ss);
archived.setName(archiveName);
// Move archive tab to end for tidiness ss.moveActiveSheet(ss.getNumSheets());
const rowCount = sh.getLastRow() - 1;
// exclude header
// -- Clear main sheet - keep header row only --
if (sh.getLastRow() >
1) {
sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
} Logger.log('archiveMonthlyData: ' + sheetName + ' → ' + archiveName + ' (' + rowCount + ' rows archived, main sheet cleared)');
results.push({
sheet: sheetName, archive: archiveName, rows: rowCount, status: 'OK'
});
});
// -- Summary email to Vipul --
const summary = results.map(r =>
r.status === 'OK' ? '✓ ' + r.sheet + ' → ' + r.archive + ' (' + r.rows + ' rows)' : ' ⚠ ' + r.sheet + ': ' + r.status ).join('\ ');
MailApp.sendEmail({
to: 'vipul.kotkar@mosaicwellness.in', subject: 'Monthly Archive Complete — ' + monthLabel, body: 'Inventory Impact monthly archive completed.\ \ ' + summary + '\ All archived sheets are available in the Google Sheet.\ ' + 'Main sheets have been cleared for ' + Utilities.formatDate(now, 'Asia/Kolkata', 'MMM yyyy') + ' data.\ ' + 'Dashboard: ' + NI_CONFIG.DASHBOARD_URL, name: 'Inventory Health Monitor',
});
Logger.log('archiveMonthlyData: complete. Summary:\ ' + summary);
return results;
}
// -- Manual trigger: archive a specific month by name --
// Usage: archiveSpecificMonth('Apr2026')
function archiveSpecificMonth(monthLabel) {
if (!monthLabel) {
Logger.log('Usage: archiveSpecificMonth("Apr2026")');
return;
}
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const SHEETS_TO_ARCHIVE = ['NI_History','NI_FacHistory','NI_DailyTop5','NI_Remarks'];
SHEETS_TO_ARCHIVE.forEach(sheetName =>
{
const sh = ss.getSheetByName(sheetName);
if (!sh || sh.getLastRow() <
2) {
Logger.log(sheetName + ': skipped (not found or empty)');
return;
}
const archiveName = sheetName + '_' + monthLabel;
const existing = ss.getSheetByName(archiveName);
if (existing) {
Logger.log(archiveName + ' already exists — overwriting');
ss.deleteSheet(existing);
}
const archived = sh.copyTo(ss);
archived.setName(archiveName);
ss.moveActiveSheet(ss.getNumSheets());
Logger.log('Archived: ' + sheetName + ' → ' + archiveName + ' (' + (sh.getLastRow()-1) + ' rows)');
});
Logger.log('archiveSpecificMonth done: ' + monthLabel);
}
// -- Set monthly archive trigger (1st of each month at 7 AM IST) --
function setMonthlyArchiveTrigger() {
// Remove existing archive triggers
ScriptApp.getProjectTriggers().forEach(t =>
{
if (t.getHandlerFunction() === 'archiveMonthlyData') ScriptApp.deleteTrigger(t);
});
ScriptApp.newTrigger('archiveMonthlyData') .timeBased() .onMonthDay(1) .atHour(7) .inTimezone('Asia/Kolkata') .create();
Logger.log('Monthly archive trigger set: 1st of every month at 7 AM IST');
}
// -- Run both triggers setup at once --
function setAllTriggers() {
setNegativeImpactTrigger();
// Daily at 8 AM IST setMonthlyArchiveTrigger();
// 1st of month at 7 AM IST Logger.log('All triggers configured.');
}
// ============================================================
// TEST
// ============================================================
function testRunNow() {
runDailyNegativeImpactReport();
}
function createYesterdayForTesting() {
const ss=SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const t=ss.getSheetByName('NI_Today');
if(!t){Logger.log('NI_Today not found');return;}
let y=ss.getSheetByName('NI_Yesterday');
if(y) ss.deleteSheet(y);
t.copyTo(ss).setName('NI_Yesterday');
Logger.log('Created NI_Yesterday from NI_Today');
}
function debugBuildMap() {
const ss=SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const target='MWBWHFP.00637.B0_N';
['NI_Today','NI_Yesterday'].forEach(sheetName=>{
const sh=ss.getSheetByName(sheetName);
if(!sh){Logger.log(sheetName+': NOT FOUND');return;}
const data=sh.getDataRange().getValues();
const h=data[0];
const si=h.indexOf('Item Type SKU Code'),bi=h.indexOf('Batch Code'),fi=h.indexOf('Facility'),ii=h.indexOf('Inventory Type'),qi=h.indexOf('Quantity');
const m={},mInv={};
data.slice(1).forEach(row=>{
const sku=String(row[si]||'').trim(),batch=String(row[bi]||'').trim(),fac=String(row[fi]||'').trim();
const key=sku+'||'+batch+'||'+fac;
if(!sku) return;
const qty=parseFloat(row[qi]||0)||0,inv=String(row[ii]||'').trim();
if(!m[key])m[key]={qty:0,inv:''};
if(!mInv[key])mInv[key]={};
m[key].qty+=qty;
if(inv){mInv[key][inv]=(mInv[key][inv]||0)+qty;m[key].inv=Object.keys(mInv[key]).reduce((a,b)=>mInv[key][a]>=mInv[key][b]?a:b);}
});
const found=Object.keys(m).filter(k=>k.startsWith(target));
Logger.log(sheetName+': '+found.length+' key(s)');
found.forEach(k=>{Logger.log(' Dominant: '+m[k].inv+' | Qty: '+m[k].qty+' | Breakdown: '+JSON.stringify(mInv[k]));});
});
}
// ============================================================
// BACKFILL - reads inventory data directly from Google Sheets
// and populates NI_History, NI_FacHistory, NI_EventHistory
// Run once after setting up new sheet.
// ============================================================
function backfillFromSheets() {
const SHEETS = {
'30 Apr 2026': '1PFY0z6yOmy6kVgmRuCtrRR-z7eTk5vcjZjCpKAjCSJE', '01 May 2026': '1qlrXUuhfNYRGaJIiPcWIDvdtVq9OA4StguRp0E-4nzQ', '02 May 2026': '1k0MMctLaBPxDaDsx89Yz0P4oYA6HdjHVCeAe-JpiHrI', '03 May 2026': '1iCuGQmwe1IzFqbRREtq-A8Y3Uxol05DC0a82QePL80Y',
};
function readSheet(sheetId) {
const ss = SpreadsheetApp.openById(sheetId);
const sh = ss.getSheets()[0];
const data = sh.getDataRange().getValues();
if (data.length <
2)
return [];
const headers = data[0].map(x =>
String(x).trim());
return data.slice(1).map(row =>
{
const o = {};
headers.forEach((k, i) =>
{
o[k] = String(row[i] === null || row[i] === undefined ? '' : row[i]).trim();
});
return o;
});
}
const dates = Object.keys(SHEETS);
// Process 3 consecutive day pairs: Apr30-May1, May1-May2, May2-May3
for (let i = 1;
i <
dates.length;
i++) {
const todayLabel = dates[i];
const yestLabel = dates[i - 1];
Logger.log('\ === ' + yestLabel + ' → ' + todayLabel + ' ===');
const todayData = readSheet(SHEETS[todayLabel]);
const yesterdayData = readSheet(SHEETS[yestLabel]);
Logger.log('Rows — Today: ' + todayData.length + ' | Yesterday: ' + yesterdayData.length);
if (!todayData.length || !yesterdayData.length) {
Logger.log(' ⚠ Skipping — empty data for ' + todayLabel);
continue;
}
// Build Date objects from label "DD Mon YYYY"
const parts = todayLabel.split(' ');
const yParts = yestLabel.split(' ');
const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const todayDate = new Date(parseInt(parts[2]), MONTHS[parts[1]], parseInt(parts[0]));
const yestDate = new Date(parseInt(yParts[2]), MONTHS[yParts[1]], parseInt(yParts[0]));
// Run the same analysis the daily trigger uses
const result = analyzeImpact_(yesterdayData, todayData, todayDate, yestDate);
result.todayStr = todayLabel;
Logger.log('Neg events: ' + result.totEv + ' | Neg COGS: ' + fmtV_(result.totVal));
Logger.log('Pos events: ' + result.posEv + ' | Pos COGS: ' + fmtV_(result.posVal));
// 1. Save NI_Events (overwrites each time - last date wins, which is fine)
saveResultsToSheet_(result, todayData);
// 2. Append row to NI_History + NI_FacHistory
appendHistory_(result);
// 3. Append top events to NI_EventHistory
appendEventHistory_(result, todayLabel);
Logger.log('✓ Written: ' + todayLabel);
Utilities.sleep(2000);
// avoid Sheets API quota
} Logger.log('\ ✅ Backfill complete!');
Logger.log('Check NI_History, NI_FacHistory, NI_EventHistory in your new sheet.');
}
// ============================================================
// MONTH-END EMAIL - runs automatically on last day of month
// ============================================================
function isLastDayOfMonth_() {
const nowIST = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
const lastDay = new Date(nowIST.getFullYear(), nowIST.getMonth()+1, 0).getDate();
return nowIST.getDate() === lastDay;
}
function sendMonthEndEmail_() {
try {
const ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
const sh = ss.getSheetByName('NI_DailyTop5');
const nowIST = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
const monthLabel = nowIST.toLocaleDateString('en-IN', {month:'long', year:'numeric'});
// Deadline = 4th of next month
const deadline = new Date(nowIST.getFullYear(), nowIST.getMonth()+1, 4) .toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'});
// Read NI_DailyTop5 for month stats
const BT_ORDER = ['Self Warehouse','Dark Store','3PL B2C','3PL B2B','Quality'];
const btMap = {};
BT_ORDER.forEach(bt =>
btMap[bt] = {total:0, pending:0, done:0, cogs:0});
let totalEvents = 0, totalPending = 0, totalDone = 0, totalCOGS = 0;
if (sh &&
sh.getLastRow() >
1) {
const data = sh.getDataRange().getValues();
const h = data[0].map(x =>
String(x).trim());
const iSkip = 0, iBT = h.indexOf('BizType'), iRmk = h.indexOf('Remark'), iCOGS = h.indexOf('COGSValue');
data.slice(1).forEach(row =>
{
const bt = String(row[iBT]||'').trim();
const rmk = String(row[iRmk]||'').trim();
const cogs = parseFloat(row[iCOGS])||0;
if(!bt) return;
if(!btMap[bt]) btMap[bt] = {total:0,pending:0,done:0,cogs:0};
btMap[bt].total++;
btMap[bt].cogs += cogs;
if(rmk) btMap[bt].done++;
else btMap[bt].pending++;
totalEvents++;
totalCOGS += cogs;
if(rmk) totalDone++;
else totalPending++;
});
}
const pct = totalEvents >
0 ? Math.round(totalDone/totalEvents*100) : 0;
const fmtV = v =>
{
const a = Math.abs(v);
if(a>=1e7)
return '₹'+(v/1e7).toFixed(2)+'Cr';
if(a>=1e5)
return '₹'+(v/1e5).toFixed(2)+'L';
if(a>=1e3)
return '₹'+(v/1e3).toFixed(1)+'K';
return '₹'+Math.round(v);
};
const btRows = BT_ORDER.filter(bt =>
btMap[bt] &&
btMap[bt].total >
0).map(bt =>
{
const s = btMap[bt];
const bpct = s.total >
0 ? Math.round(s.done/s.total*100) : 0;
const col = bpct >= 80 ? '#16a34a' : bpct >= 40 ? '#d97706' : '#dc2626';
return `<tr style="border-bottom:1px solid #f1f5f9">
<td style="padding:9px 14px;font-size:12px;font-weight:600;color:#1e3a5f">${bt}</td>
<td style="padding:9px 14px;text-align:center;font-family:monospace;font-weight:700">${s.total}</td>
<td style="padding:9px 14px;text-align:center;font-family:monospace;font-weight:700;color:#dc2626">${s.pending}</td>
<td style="padding:9px 14px;text-align:center;font-family:monospace;font-weight:700;color:#16a34a">${s.done}</td>
<td style="padding:9px 14px;text-align:center;font-weight:700;color:${col}">${bpct}%</td>
<td style="padding:9px 14px;text-align:right;font-family:monospace;font-size:11px;color:#1e3a5f">${fmtV(s.cogs)}</td>
</tr>`;
}).join('');
const emailHtml = ` <div style="font-family:'Inter',Arial,sans-serif;max-width:680px;margin:0 auto;color:#0c1220">
<!-- HEADER -->
<div style="background:linear-gradient(135deg, #1a6b5a, #0f4c35);padding:28px 32px;border-radius:14px 14px 0 0">
<div style="font-size:11px;color:#a7f3d0;letter-spacing:1px;font-weight:600;text-transform:uppercase">Month-End Summary</div>
<div style="font-size:24px;font-weight:800;color:#fff;margin:8px 0 4px">${monthLabel} — Remarks Status</div>
<div style="font-size:13px;color:#6ee7b7">Inventory Impact Dashboard · Mosaic Wellness</div>
</div>
<!-- DEADLINE BANNER -->
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 20px;font-size:13px;color:#92400e">
⏰ <strong>Deadline to close pending remarks: ${deadline}</strong><br>
<span style="font-size:11px">Please update all pending remarks before the deadline. Data will be archived thereafter.</span>
</div>
<!-- KPI STRIP -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #e2e8f0;border-top:none">
<div style="padding:16px;text-align:center;border-right:1px solid #e2e8f0">
<div style="font-size:9px;font-weight:700;color:#6b7280;letter-spacing:.5px">TOTAL EVENTS</div>
<div style="font-size:26px;font-weight:800;color:#0c1220">${totalEvents}</div>
</div>
<div style="padding:16px;text-align:center;border-right:1px solid #e2e8f0">
<div style="font-size:9px;font-weight:700;color:#dc2626;letter-spacing:.5px">PENDING</div>
<div style="font-size:26px;font-weight:800;color:#dc2626">${totalPending}</div>
</div>
<div style="padding:16px;text-align:center;border-right:1px solid #e2e8f0">
<div style="font-size:9px;font-weight:700;color:#16a34a;letter-spacing:.5px">COMPLETED</div>
<div style="font-size:26px;font-weight:800;color:#16a34a">${totalDone}</div>
</div>
<div style="padding:16px;text-align:center">
<div style="font-size:9px;font-weight:700;color:#1d4ed8;letter-spacing:.5px">COMPLETION</div>
<div style="font-size:26px;font-weight:800;color:#1d4ed8">${pct}%</div>
</div>
</div>
<!-- BT TABLE -->
<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;overflow:hidden">
<div style="padding:12px 18px;background:#f8fafc;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:1px solid #e2e8f0">
Business-wise Remarks Pendency </div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<thead><tr style="background:#f1f5f9">
<th style="padding:9px 14px;text-align:left;font-size:9px;font-weight:700;color:#6b7280">BUSINESS UNIT</th>
<th style="padding:9px 14px;text-align:center;font-size:9px;font-weight:700;color:#6b7280">EVENTS</th>
<th style="padding:9px 14px;text-align:center;font-size:9px;font-weight:700;color:#dc2626">PENDING</th>
<th style="padding:9px 14px;text-align:center;font-size:9px;font-weight:700;color:#16a34a">DONE</th>
<th style="padding:9px 14px;text-align:center;font-size:9px;font-weight:700;color:#6b7280">COMPLETION</th>
<th style="padding:9px 14px;text-align:right;font-size:9px;font-weight:700;color:#6b7280">COGS</th>
</tr></thead>
<tbody>${btRows}</tbody>
</table>
<div style="padding:14px 18px;font-size:11px;color:#6b7280;text-align:center">
Total COGS tracked: <strong>${fmtV(totalCOGS)}</strong>
&nbsp;·&nbsp;
<a href="${NI_CONFIG.DASHBOARD_URL}" style="color:#1a6b5a;font-weight:700">Open Dashboard to update remarks →</a>
</div>
</div>
</div>`;
const subject = ` 📊 ${monthLabel} Closing — ${totalPending} Remarks Pending (Deadline: ${deadline})`;
MailApp.sendEmail({
to: 'vipul.kotkar@mosaicwellness.in', bcc: NI_CONFIG.REPORT_TO.join(','), subject: subject, htmlBody: emailHtml, name: 'Inventory Health Monitor'
});
Logger.log('Month-end email sent. Pending: ' + totalPending + '/' + totalEvents);
} catch(e) {
Logger.log('sendMonthEndEmail_ ERROR: ' + e.message);
}
}
// -- Cross-day G2B dedup -----------------------------------------------------
function hasExistingG2B_(ss, sku, batch, fac) {
const sh = ss.getSheetByName('NI_Events');
if (!sh || sh.getLastRow() <
2)
return false;
const data = sh.getDataRange().getValues();
const h = data[0].map(c =>
String(c).trim());
const iType = h.indexOf('Type');
const iSKU = h.indexOf('SKU');
const iBatch = h.indexOf('Batch');
const iFac = h.indexOf('Facility');
if (iType <
0 || iSKU <
0)
return false;
for (let i = 1;
i <
data.length;
i++) {
if (String(data[i][iType]) === 'g2b' &&
String(data[i][iSKU]) === sku &&
String(data[i][iBatch]) === batch &&
String(data[i][iFac]) === fac) {
return true;
}
}
return false;
}
// -- Public wrappers (visible in Run menu) -----------------------------------
function copyMayArchivesToJuneSheet() {
const MAY_ID = '1yOU97Zo_tNSA9MXC2doT4p9PNhH4KvmLdtlWj_UpSy8';
const JUN_ID = '186DE9ujZs7wuBwN1lseqCjI3kiIEM1DLEFLQbwjKzpM';
const maySS = SpreadsheetApp.openById(MAY_ID);
const junSS = SpreadsheetApp.openById(JUN_ID);
const ARCHIVE_TABS = [ 'NI_DailyTop5_May2026', 'NI_History_May2026', 'NI_FacHistory_May2026', 'NI_Remarks_May2026', 'NI_Remarks_Master' ];
ARCHIVE_TABS.forEach(tabName =>
{
const src = maySS.getSheetByName(tabName);
if (!src) {
Logger.log('SKIP (not found in May): ' + tabName);
return;
}
let dst = junSS.getSheetByName(tabName);
if (dst) {
Logger.log('SKIP (already exists in June): ' + tabName);
return;
} src.copyTo(junSS).setName(tabName);
Logger.log('Copied: ' + tabName);
});
Logger.log('copyMayArchivesToJuneSheet: done.');
}
function checkTriggers() {
const triggers = ScriptApp.getProjectTriggers();
triggers.forEach(t =>
{
Logger.log( 'Function: ' + t.getHandlerFunction() + ' | Type: ' + t.getEventType() + ' | Source: ' + t.getTriggerSource() );
});
Logger.log('Total triggers: ' + triggers.length);
}
// ============================================================
// DIAGNOSTIC: Run this to understand why backfillTop5FromNIEvents
// finds nothing to write. Logs counts at each filter stage.
// ============================================================
function diagTop5() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var evSh = ss.getSheetByName('NI_Events');
var top5Sh = ss.getSheetByName('NI_DailyTop5');
Logger.log('NI_Events rows: ' + (evSh ? evSh.getLastRow()-1 : 'SHEET NOT FOUND'));
Logger.log('NI_DailyTop5 rows: ' + (top5Sh ? top5Sh.getLastRow()-1 : 'SHEET NOT FOUND'));
if (!evSh || evSh.getLastRow() <
2) return;
var evData = evSh.getDataRange().getValues();
var evH = evData[0].map(function(h){
return String(h).trim();
});
var iDate=evH.indexOf('Date'), iType=evH.indexOf('Type'), iIC=evH.indexOf('Impact Class'), iCOGS=evH.indexOf('COGSValue'), iEv=evH.indexOf('Event'), iSku=evH.indexOf('SKU'), iBatch=evH.indexOf('Batch'), iFac=evH.indexOf('Facility');
Logger.log('Column indices — Date:'+iDate+' Type:'+iType+' IC:'+iIC+' COGSValue:'+iCOGS);
var cTotal=0, cNeg=0, cFL=0, cCogsOk=0, cDateOk=0;
var datesSeen={}, cogsZeroSample=[], invalidDateSample=[];
for (var i=1;
i<evData.length;
i++) {
var r = evData[i];
cTotal++;
if (String(r[iType]||'').trim() !== 'NEG') continue;
cNeg++;
var ic = iIC>=0 ? String(r[iIC]||'').trim() : '';
if (ic === 'Expiry Risk') continue;
cFL++;
var cogsVal = parseFloat(r[iCOGS])||0;
if (cogsVal <= 0) {
if (cogsZeroSample.length <
3) cogsZeroSample.push(String(r[iSku]||''));
continue;
} cCogsOk++;
var rawDate = r[iDate];
var d = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
if (isNaN(d.getTime())) {
if (invalidDateSample.length <
3) invalidDateSample.push(String(rawDate));
continue;
} cDateOk++;
var ds = Utilities.formatDate(d, 'Asia/Kolkata', 'dd MMM yyyy');
datesSeen[ds] = (datesSeen[ds]||0) + 1;
} Logger.log('Filter chain: Total='+cTotal+' | NEG='+cNeg+' | After ER filter='+cFL+' | COGS>0='+cCogsOk+' | ValidDate='+cDateOk);
Logger.log('Dates in candidate pool: ' + JSON.stringify(Object.keys(datesSeen).sort()));
if (cogsZeroSample.length) Logger.log('Sample zero-COGS SKUs: ' + cogsZeroSample.join(', '));
if (invalidDateSample.length) Logger.log('Sample invalid dates: ' + invalidDateSample.join(', '));
// Check existing Top5 EH_IDs
if (top5Sh &&
top5Sh.getLastRow() >
1) {
var existingIds = top5Sh.getRange(2,1,top5Sh.getLastRow()-1,1).getValues().map(function(r){return String(r[0]).trim();});
Logger.log('Existing Top5 EH_IDs: ' + existingIds.length);
Logger.log('Sample Top5 EH_IDs: ' + existingIds.slice(0,3).join(' | '));
}
// Sample a candidate EH_ID to compare format
for (var i=1;
i<evData.length;
i++) {
var r = evData[i];
if (String(r[iType]||'').trim()!=='NEG') continue;
if ((parseFloat(r[iCOGS])||0)<=0) continue;
var rawDate=r[iDate];
var d=(rawDate instanceof Date)?rawDate:new Date(rawDate);
if(isNaN(d.getTime())) continue;
var ds=Utilities.formatDate(d,'Asia/Kolkata','dd MMM yyyy');
var ehId=[ds,String(r[iSku]||''),String(r[iBatch]||''),String(r[iFac]||''),String(r[iEv]||'')].join('|');
Logger.log('Sample candidate EH_ID: ' + ehId);
break;
}
}
// ============================================================
// BACKFILL NI_DailyTop5 FROM NI_EVENTS
// Run this after backfillFromMayNIEvents to populate NI_DailyTop5
// for any past dates that have NI_Events rows but no Top5 rows.
// Schema (17 cols): EH_ID|Date|Brand|SKU|Name|Batch|Facility|City|BizType|Event|Qty|COGSValue|Rank|Remark|Status|AssignedTo|RemarkDate
// Writes top 5 per brand per day (up to 20 rows per day).
// ============================================================
function backfillTop5FromNIEvents() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var evSh = ss.getSheetByName('NI_Events');
if (!evSh || evSh.getLastRow() <
2) {
Logger.log('backfillTop5FromNIEvents: NI_Events is empty. Run backfillFromMayNIEvents first.');
return;
}
var evData = evSh.getDataRange().getValues();
var evH = evData[0].map(function(h){
return String(h).trim();
});
var iDate = evH.indexOf('Date'), iType = evH.indexOf('Type'), iSku = evH.indexOf('SKU'), iName = evH.indexOf('Name'), iBrand = evH.indexOf('Brand'), iBatch = evH.indexOf('Batch'), iFac = evH.indexOf('Facility'), iCity = evH.indexOf('City'), iBT = evH.indexOf('BizType'), iQty = evH.indexOf('Qty'), iCOGS = evH.indexOf('COGSValue'), iEv = evH.indexOf('Event'), iIC = evH.indexOf('Impact Class'), iSF = evH.indexOf('StateFrom');
// Group FINANCIAL LOSS negative events by date - then by brand
// Expiry Risk (stateFrom!=Active) is excluded from Top5
var byDate = {};
for (var i = 1;
i <
evData.length;
i++) {
var r = evData[i];
if (String(r[iType]||'').trim() !== 'NEG') continue;
// Filter: Financial Loss only
var ic = iIC >= 0 ? String(r[iIC]||'').trim() : '';
var sf = iSF >= 0 ? String(r[iSF]||'').trim() : '';
if (ic === 'Expiry Risk') continue;
if (ic === '' &&
sf !== '' &&
sf !== 'Active') continue;
// fallback if IC not yet set
var cogsVal = parseFloat(r[iCOGS])||0;
if (cogsVal <= 0) continue;
var rawDate = r[iDate];
var d = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
if (isNaN(d.getTime())) continue;
var dateStr = Utilities.formatDate(d, 'Asia/Kolkata', 'dd MMM yyyy');
var sku = String(r[iSku]||'').trim();
var brand = (iBrand >= 0 &&
r[iBrand]) ? String(r[iBrand]).trim() : getBrandFromSKU_(sku);
if (!brand) brand = 'Other';
if (!byDate[dateStr]) byDate[dateStr] = {};
if (!byDate[dateStr][brand]) byDate[dateStr][brand] = [];
byDate[dateStr][brand].push({
sku: sku, name: String(r[iName]||'').trim(), batch: String(r[iBatch]||'').trim(), fac: String(r[iFac]||'').trim(), city: String(r[iCity]||'').trim(), bt: String(r[iBT]||'').trim(), qty: parseFloat(r[iQty])||0, cogsVal: cogsVal, event: String(r[iEv]||'').trim(), ic: iIC >= 0 ? String(r[iIC]||'').trim() : 'Financial Loss'
});
}
// Load existing EH_IDs from NI_DailyTop5 to avoid duplicates
var top5Sh = getDailyTop5Sheet_();
var existingIds = new Set();
if (top5Sh.getLastRow() >
1) {
top5Sh.getRange(2, 1, top5Sh.getLastRow()-1, 1).getValues() .forEach(function(r){
existingIds.add(String(r[0]).trim());
});
}
var SYSTEM_EVENTS = ['Active to Near Expiry','Near Expiry to Expired','Active to Expired'];
var RECALL_EVENTS = ['Active to Recalled'];
var allNewRows = [];
// For each date and brand: take top 5 by COGSValue
Object.keys(byDate).sort().forEach(function(dateStr) {
Object.keys(byDate[dateStr]).sort().forEach(function(brand) {
var events = byDate[dateStr][brand].sort(function(a,b){
return b.cogsVal - a.cogsVal;
}).slice(0,5);
events.forEach(function(x, idx) {
var ehId = makeEhId_(dateStr, x.sku, x.batch, x.fac, x.event);
if (existingIds.has(ehId)) return;
var isSystem = SYSTEM_EVENTS.some(function(e){ return x.event && x.event.includes(e); });
var isRecall = RECALL_EVENTS.some(function(e){ return x.event && x.event.includes(e); });
var autoRemark = isSystem ? 'System Triggered - Expiry workflow' : isRecall ? 'QC Triggered - Batch Recalled' : '';
var autoStatus = (isSystem || isRecall) ? 'Completed' : 'Pending';
var autoAssigned = (isSystem || isRecall) ? 'System' : '';
var autoDate = (isSystem || isRecall) ? dateStr : '';
allNewRows.push([ ehId, dateStr, brand, x.sku, x.name, x.batch, x.fac, x.city, x.bt, x.event, x.ic || 'Financial Loss', x.qty, x.cogsVal, idx+1, autoRemark, autoStatus, autoAssigned, autoDate ]);
existingIds.add(ehId);
});
});
});
if (allNewRows.length === 0) {
Logger.log('backfillTop5FromNIEvents: Nothing new to write.');
return;
} top5Sh.getRange(top5Sh.getLastRow()+1, 1, allNewRows.length, 18).setValues(allNewRows);
SpreadsheetApp.flush();
Logger.log('backfillTop5FromNIEvents: Wrote ' + allNewRows.length + ' rows across ' + Object.keys(byDate).length + ' dates.');
}
// ============================================================
// ONE-TIME: Patch Remark + AssignedTo from May archive into June NI_DailyTop5
// Matches on EH_ID (col 1). Copies Remark, Status, AssignedTo, RemarkDate
// where the June row currently has no remark.
// Run once after backfillTop5FromNIEvents.
// ============================================================
function patchRemarksFromMayArchive() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
// Source: NI_DailyTop5_May2026 - try June sheet first, then May sheet
var srcSh = ss.getSheetByName('NI_DailyTop5_May2026');
if (!srcSh) {
// Try May sheet directly
try {
var maySS = SpreadsheetApp.openById('1yOU97Zo_tNSA9MXC2doT4p9PNhH4KvmLdtlWj_UpSy8');
srcSh = maySS.getSheetByName('NI_DailyTop5') || maySS.getSheetByName('NI_DailyTop5_May2026');
} catch(e) {}
}
if (!srcSh) {
Logger.log('patchRemarksFromMayArchive: Source not found in June sheet or May sheet.');
return;
} Logger.log('patchRemarksFromMayArchive: Reading from ' + srcSh.getParent().getName() + ' / ' + srcSh.getName());
var destSh = ss.getSheetByName('NI_DailyTop5');
if (!destSh || destSh.getLastRow() <
2) {
Logger.log('patchRemarksFromMayArchive: NI_DailyTop5 empty.');
return;
}
// Read source - build map of EH_ID ->
{remark, status, assignedTo, remarkDate}
var srcData = srcSh.getDataRange().getValues();
var srcH = srcData[0].map(function(h){
return String(h).trim();
});
var sEhId = srcH.indexOf('EH_ID'), sRmk = srcH.indexOf('Remark'), sStat = srcH.indexOf('Status'), sAsgn = srcH.indexOf('AssignedTo'), sRDate = srcH.indexOf('RemarkDate');
if (sEhId <
0 || sRmk <
0) {
Logger.log('patchRemarksFromMayArchive: Source missing EH_ID or Remark columns.');
return;
}
var remarkMap = {};
for (var i = 1;
i <
srcData.length;
i++) {
var r = srcData[i];
var ehId = String(r[sEhId]||'').trim();
var remark = sRmk >= 0 ? String(r[sRmk]||'').trim() : '';
if (ehId &&
remark) {
remarkMap[ehId] = {
remark: remark, status: sStat >= 0 ? String(r[sStat] ||'').trim() : '', assignedTo: sAsgn >= 0 ? String(r[sAsgn] ||'').trim() : '', remarkDate: sRDate >= 0 ? r[sRDate] : ''
};
}
} Logger.log('patchRemarksFromMayArchive: ' + Object.keys(remarkMap).length + ' remarks found in May archive.');
// Read destination
var destData = destSh.getDataRange().getValues();
var destH = destData[0].map(function(h){
return String(h).trim();
});
var dEhId = destH.indexOf('EH_ID'), dRmk = destH.indexOf('Remark'), dStat = destH.indexOf('Status'), dAsgn = destH.indexOf('AssignedTo'), dRDate = destH.indexOf('RemarkDate');
if (dEhId <
0 || dRmk <
0) {
Logger.log('patchRemarksFromMayArchive: NI_DailyTop5 missing required columns.');
return;
}
var patched = 0;
for (var i = 1;
i <
destData.length;
i++) {
var row = destData[i];
var ehId = String(row[dEhId]||'').trim();
var existingRemark = dRmk >= 0 ? String(row[dRmk]||'').trim() : '';
// Only patch if current row has no remark and May archive has one
if (ehId &&
!existingRemark &&
remarkMap[ehId]) {
var m = remarkMap[ehId];
var sheetRow = i + 1;
// 1-based
if (dRmk >= 0) destSh.getRange(sheetRow, dRmk + 1).setValue(m.remark);
if (dStat >= 0) destSh.getRange(sheetRow, dStat + 1).setValue(m.status || 'Completed');
if (dAsgn >= 0) destSh.getRange(sheetRow, dAsgn + 1).setValue(m.assignedTo);
if (dRDate>= 0) destSh.getRange(sheetRow, dRDate+ 1).setValue(m.remarkDate);
patched++;
}
} SpreadsheetApp.flush();
Logger.log('patchRemarksFromMayArchive: patched ' + patched + ' rows in NI_DailyTop5.');
}
// ============================================================
// MIGRATE 1-JUN ENTRIES FROM NI_DailyTop5_May2026 ARCHIVE
// The May2026 archive has 1-Jun entries in old format. This
// remaps them to the new 17-col schema and inserts into NI_DailyTop5.
// Run once after copying the May archive to June sheet.
// ============================================================
function migrate1JunFromMayArchive() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var srcSh = ss.getSheetByName('NI_DailyTop5_May2026');
if (!srcSh || srcSh.getLastRow() <
2) {
Logger.log('migrate1JunFromMayArchive: NI_DailyTop5_May2026 not found or empty.');
return;
}
var srcData = srcSh.getDataRange().getValues();
var srcH = srcData[0].map(function(h){
return String(h).trim();
});
// May2026 schema: EH_ID|Date|Brand|Rank|SKU Code|Vendor Batch Number|Item Name|Facility|Business Type|Event|Quantity|COGS Value|Remark|Status|Assigned To|Remark Date
var iEhId = srcH.indexOf('EH_ID');
var iDate = srcH.indexOf('Date');
var iBrand = srcH.indexOf('Brand');
var iRank = srcH.indexOf('Rank');
var iSku = srcH.indexOf('SKU Code');
if (iSku<0) iSku = srcH.indexOf('SKU');
var iBatch = srcH.indexOf('Vendor Batch Number');
if (iBatch<0) iBatch = srcH.indexOf('Batch');
var iName = srcH.indexOf('Item Name');
if (iName<0) iName = srcH.indexOf('Name');
var iFac = srcH.indexOf('Facility');
var iBT = srcH.indexOf('Business Type');
if (iBT<0) iBT = srcH.indexOf('BizType');
var iEv = srcH.indexOf('Event');
var iQty = srcH.indexOf('Quantity');
if (iQty<0) iQty = srcH.indexOf('Qty');
var iCOGS = srcH.indexOf('COGS Value');
if (iCOGS<0) iCOGS = srcH.indexOf('COGSValue');
var iRmk = srcH.indexOf('Remark');
var iStatus = srcH.indexOf('Status');
var iAssign = srcH.indexOf('Assigned To');
if (iAssign<0) iAssign = srcH.indexOf('AssignedTo');
var iRDate = srcH.indexOf('Remark Date');
if (iRDate<0) iRDate = srcH.indexOf('RemarkDate');
// Load existing EH_IDs to avoid duplicates
var top5Sh = getDailyTop5Sheet_();
var existingIds = new Set();
if (top5Sh.getLastRow() >
1) {
top5Sh.getRange(2, 1, top5Sh.getLastRow()-1, 1).getValues() .forEach(function(r){
existingIds.add(String(r[0]).trim());
});
}
var newRows = [];
for (var i = 1;
i <
srcData.length;
i++) {
var r = srcData[i];
var rawDate = r[iDate];
// Only migrate 1-Jun entries (date string contains 'Jun' and '1' or '01')
var dateStr = (rawDate instanceof Date) ? Utilities.formatDate(rawDate, 'Asia/Kolkata', 'dd MMM yyyy') : String(rawDate).trim();
// Accept "01 Jun 2026", "1 Jun 2026", "01 June 2026", "1 June 2026"
if (!/^0?1\s+(Jun|June)\s+2026$/i.test(dateStr)) continue;
var normalDate = '01 Jun 2026';
var sku = iSku >= 0 ? String(r[iSku] ||'').trim() : '';
var batch = iBatch >= 0 ? String(r[iBatch] ||'').trim() : '';
var fac = iFac >= 0 ? String(r[iFac] ||'').trim() : '';
var ev = iEv >= 0 ? String(r[iEv] ||'').trim() : '';
var brand = iBrand >= 0 ? String(r[iBrand] ||'').trim() : getBrandFromSKU_(sku);
var ehId = iEhId >= 0 ? String(r[iEhId] ||'').trim() : makeEhId_(normalDate, sku, batch, fac, ev);
if(!ehId) ehId = makeEhId_(normalDate, sku, batch, fac, ev);
if (existingIds.has(ehId)) continue;
var city = getCity_(fac);
newRows.push([ ehId, normalDate, brand, sku, iName >= 0 ? String(r[iName] ||'').trim() : '', batch, fac, city, iBT >= 0 ? String(r[iBT] ||'').trim() : '', ev, iQty >= 0 ? (parseFloat(r[iQty])||0) : 0, iCOGS >= 0 ? (parseFloat(r[iCOGS])||0) : 0, iRank >= 0 ? (parseInt(r[iRank])||0) : 0, iRmk >= 0 ? String(r[iRmk] ||'').trim() : '', iStatus >= 0 ? String(r[iStatus]||'').trim() : 'Pending', iAssign >= 0 ? String(r[iAssign]||'').trim() : '', iRDate >= 0 ? String(r[iRDate] ||'').trim() : '' ]);
existingIds.add(ehId);
}
if (newRows.length === 0) {
Logger.log('migrate1JunFromMayArchive: No 1-Jun rows found or all already migrated.');
return;
} top5Sh.getRange(top5Sh.getLastRow()+1, 1, newRows.length, 17).setValues(newRows);
SpreadsheetApp.flush();
Logger.log('migrate1JunFromMayArchive: Migrated ' + newRows.length + ' rows from NI_DailyTop5_May2026.');
}
function backfillFromMayNIEvents() {
var MAY_SHEET_ID = '1yOU97Zo_tNSA9MXC2doT4p9PNhH4KvmLdtlWj_UpSy8';
var JUN_SHEET_ID = '186DE9ujZs7wuBwN1lseqCjI3kiIEM1DLEFLQbwjKzpM';
var BACKFILL_START = new Date('2026-06-01T00:00:00');
var BACKFILL_END = new Date();
// through today (run date)
var maySS = SpreadsheetApp.openById(MAY_SHEET_ID);
var maySh = maySS.getSheetByName('NI_Events');
if (!maySh) {
Logger.log('ERROR: NI_Events not found in May sheet.');
return;
}
var mayData = maySh.getDataRange().getValues();
if (mayData.length <
2) {
Logger.log('ERROR: May NI_Events is empty.');
return;
}
var mayHeaders = mayData[0].map(function(h){
return String(h).trim();
});
function col(name){
return mayHeaders.indexOf(name);
}
var mC = {
date:col('Date'), type:col('Type'), direction:col('Direction'), sku:col('SKU'), name:col('Name'), brand:col('Brand'), batch:col('Batch'), facility:col('Facility'), city:col('City'), bizType:col('BizType'), invFrom:col('InvFrom'), invTo:col('InvTo'), stateFrom:col('StateFrom'), stateTo:col('StateTo'), qty:col('Qty'), cogsPerUnit:col('COGSPerUnit'), cogsValue:col('COGSValue'), event:col('Event'), severity:col('Severity')
};
var junSS = SpreadsheetApp.openById(JUN_SHEET_ID);
var junSh = junSS.getSheetByName('NI_Events');
if (!junSh) {
Logger.log('NI_Events not found in June sheet - creating it.');
junSh = junSS.insertSheet('NI_Events');
}
var EXPECTED = [ 'Date','Type','Direction','Category','SKU','Name','Brand','Batch','Facility','City', 'BizType','InvFrom','InvTo','StateFrom','StateTo','Qty','COGSPerUnit', 'COGSValue','Event','Severity','Impact Class' ];
// Same rule as getImpactClass_ - InvFrom + StateFrom + type
function backfillIC_(stateFrom, type, invFrom) {
if (type === 'POS')
return 'Recovery';
if (invFrom === 'BAD_INVENTORY' || invFrom === 'QC_REJECTED')
return 'Expiry Risk';
if (stateFrom === 'Active' || stateFrom === '')
return 'Financial Loss';
if (stateFrom === 'About_to_expire' || stateFrom === 'Recalled')
return 'Expiry Risk';
return 'Financial Loss';
}
var junData = junSh.getDataRange().getValues();
var junHeaders = junData[0] ? junData[0].map(function(h){
return String(h).trim();
}) : [];
if (junData.length <
1 || junHeaders[0] !== 'Date') {
junSh.clearContents();
junSh.appendRow(EXPECTED);
junData = junSh.getDataRange().getValues();
junHeaders = junData[0].map(function(h){
return String(h).trim();
});
}
var jC = {
date:junHeaders.indexOf('Date'), sku:junHeaders.indexOf('SKU'), batch:junHeaders.indexOf('Batch'), facility:junHeaders.indexOf('Facility'), type:junHeaders.indexOf('Type')
};
var existingKeys = {};
for (var i = 1;
i <
junData.length;
i++) {
var r = junData[i];
var d = r[jC.date];
var ds = (d instanceof Date) ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(d).substring(0,10);
existingKeys[[ds,r[jC.sku],r[jC.batch],r[jC.facility],r[jC.type]].join('||')] = true;
} Logger.log('Existing June NI_Events rows: ' + (junData.length - 1));
var newRows = [], skipped = 0, outOfRange = 0;
for (var i = 1;
i <
mayData.length;
i++) {
var r = mayData[i];
if (!r || r.every(function(c){
return c===''||c===null;
})) continue;
var rawDate = r[mC.date];
var d = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
if (isNaN(d.getTime()) || d <
BACKFILL_START || d >
BACKFILL_END) {
outOfRange++;
continue;
}
var ds = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
var sku = mC.sku >= 0 ? String(r[mC.sku] || '') : '';
var batch = mC.batch >= 0 ? String(r[mC.batch] || '') : '';
var facility = mC.facility >= 0 ? String(r[mC.facility] || '') : '';
var type = mC.type >= 0 ? String(r[mC.type] || '') : '';
var key = [ds, sku, batch, facility, type].join('||');
if (existingKeys[key]) {
skipped++;
continue;
}
var brand = (mC.brand >= 0 &&
r[mC.brand]) ? String(r[mC.brand]) : getBrandFromSKU_(sku);
var cat = mC.direction >= 0 ? String(r[mC.direction]||'') : '';
var CATEGORY_LABEL = {
g2b:'Good to Bad', g2q:'Good to QC Rejected', g2rc:'Good to Recalled', a2ne:'Active to Near Expiry', ne2e:'Near Expiry to Expired', a2e:'Active to Expired', a2rc:'Active to Recalled', newBad:'Direct Bad GRN', newQC:'Direct QC GRN', pos:'Recovery (Bad/QC to Good)'
};
newRows.push([ d, type, cat, CATEGORY_LABEL[cat]||cat, sku, mC.name >= 0 ? r[mC.name] : '', brand, batch, facility, mC.city >= 0 ? r[mC.city] : '', mC.bizType >= 0 ? r[mC.bizType] : '', mC.invFrom >= 0 ? r[mC.invFrom] : '', mC.invTo >= 0 ? r[mC.invTo] : '', mC.stateFrom >= 0 ? r[mC.stateFrom] : '', mC.stateTo >= 0 ? r[mC.stateTo] : '', mC.qty >= 0 ? r[mC.qty] : '', mC.cogsPerUnit >= 0 ? r[mC.cogsPerUnit] : '', mC.cogsValue >= 0 ? r[mC.cogsValue] : '', mC.event >= 0 ? r[mC.event] : '', mC.severity >= 0 ? r[mC.severity] : '', backfillIC_(mC.stateFrom >= 0 ? String(r[mC.stateFrom]||'') : '', type, mC.invFrom >= 0 ? String(r[mC.invFrom]||'') : '') ]);
existingKeys[key] = true;
} Logger.log('Out of range: ' + outOfRange + ' | Skipped (dup): ' + skipped + ' | New: ' + newRows.length);
if (newRows.length === 0) {
Logger.log('Nothing to append.');
return;
} junSh.getRange(junSh.getLastRow() + 1, 1, newRows.length, EXPECTED.length).setValues(newRows);
Logger.log('SUCCESS: Appended ' + newRows.length + ' rows to June NI_Events.');
}
// -- ONE-TIME: patch Impact Class into existing NI_Events ------------------
// Run this ONCE if NI_Events already has rows but column U header is missing.
// Adds the header and back-fills Impact Class for every existing row.
function fixNIEventsImpactClass() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var sh = ss.getSheetByName('NI_Events');
if (!sh) {
Logger.log('NI_Events not found');
return;
}
var lastCol = sh.getLastColumn();
var lastRow = sh.getLastRow();
if (lastRow <
1) {
Logger.log('NI_Events is empty');
return;
}
var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
var icIdx = headers.indexOf('Impact Class');
// 0-based
// Step 1: add header if missing
var icSheetCol;
// 1-based
if (icIdx === -1) {
icSheetCol = lastCol + 1;
sh.getRange(1, icSheetCol).setValue('Impact Class');
Logger.log('Added Impact Class header at column ' + icSheetCol);
} else {
icSheetCol = icIdx + 1;
Logger.log('Impact Class header already at column ' + icSheetCol);
}
if (lastRow <
2) {
Logger.log('No data rows to patch');
return;
}
// Step 2: reclassify using InvFrom + StateFrom (same rule as getImpactClass_)
var sfIdx = headers.indexOf('StateFrom');
var typeIdx = headers.indexOf('Type');
var ifIdx = headers.indexOf('InvFrom');
var data = sh.getRange(2, 1, lastRow - 1, Math.max(lastCol, icSheetCol)).getValues();
var patchCount = 0;
data.forEach(function(row, i) {
var existingIC = (icSheetCol - 1 <
row.length) ? String(row[icSheetCol - 1] || '').trim() : '';
// Always overwrite - reapply logic even if a value exists already
var type = typeIdx >= 0 ? String(row[typeIdx] || '').trim() : '';
var sf = sfIdx >= 0 ? String(row[sfIdx] || '').trim() : '';
var iF = ifIdx >= 0 ? String(row[ifIdx] || '').trim() : '';
var ic;
if (type === 'POS') ic = 'Recovery';
else
if (iF === 'BAD_INVENTORY' || iF === 'QC_REJECTED') ic = 'Expiry Risk';
else
if (sf === 'Active' || sf === '') ic = 'Financial Loss';
else
if (sf === 'About_to_expire' || sf === 'Recalled') ic = 'Expiry Risk';
else ic = 'Financial Loss';
if (String(row[icSheetCol - 1] || '').trim() !== ic) {
sh.getRange(i + 2, icSheetCol).setValue(ic);
patchCount++;
}
});
SpreadsheetApp.flush();
// Diagnostic: count IC breakdown to confirm correctness
var counts = {};
data.forEach(function(row) {
var ic = String(row[icSheetCol - 1] || '').trim() || '(blank)';
counts[ic] = (counts[ic] || 0) + 1;
});
Logger.log('fixNIEventsImpactClass: patched ' + patchCount + ' rows. sfIdx=' + sfIdx + ' typeIdx=' + typeIdx);
Logger.log('IC breakdown: ' + JSON.stringify(counts));
}
// -- ONE-TIME: create SKU_Names sheet (paste your SKU-Name master here) -----
// Schema: SKU | Name
// After populating this sheet run patchNamesFromSKUMaster() to backfill history
function createSKUNamesSheet() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var sh = ss.getSheetByName('SKU_Names');
if (!sh) {
sh = ss.insertSheet('SKU_Names');
sh.getRange(1, 1, 1, 2).setValues([['SKU', 'Name']]).setFontWeight('bold');
sh.setFrozenRows(1);
Logger.log('SKU_Names sheet created. Paste your SKU list (col A) and product names (col B), then run patchNamesFromSKUMaster.');
} else {
Logger.log('SKU_Names sheet already exists (' + (sh.getLastRow() - 1) + ' rows).');
}
}
// -- ONE-TIME: backfill Name column in NI_Events and NI_DailyTop5 ------------
// Prerequisites: SKU_Names sheet must be populated (run createSKUNamesSheet first)
// Safe to re-run - only patches rows where Name is blank
function patchNamesFromSKUMaster() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
// Load SKU_Names into a local map
var nameSh = ss.getSheetByName('SKU_Names');
if (!nameSh || nameSh.getLastRow() <
2) {
Logger.log('patchNamesFromSKUMaster: SKU_Names sheet is empty. Populate it first.');
return;
}
var nameData = nameSh.getRange(2, 1, nameSh.getLastRow() - 1, 2).getValues();
var nameMap = {};
nameData.forEach(function(r) {
var sku = String(r[0] || '').trim();
var name = String(r[1] || '').trim();
if (sku &&
name) nameMap[sku] = name;
});
Logger.log('patchNamesFromSKUMaster: loaded ' + Object.keys(nameMap).length + ' SKU→Name entries.');
var totalPatched = 0;
// -- Patch NI_Events (Name = col F, index 5) ------------------------------
var evSh = ss.getSheetByName('NI_Events');
if (evSh &&
evSh.getLastRow() >
1) {
var evH = evSh.getRange(1, 1, 1, evSh.getLastColumn()).getValues()[0].map(String);
var evNameCol = evH.indexOf('Name') + 1;
// 1-based
var evSkuCol = evH.indexOf('SKU') + 1;
if (evNameCol >
0 &&
evSkuCol >
0) {
var evData = evSh.getRange(2, 1, evSh.getLastRow() - 1, evSh.getLastColumn()).getValues();
evData.forEach(function(row, i) {
var existingName = String(row[evNameCol - 1] || '').trim();
if (existingName !== '') return;
var sku = String(row[evSkuCol - 1] || '').trim();
var name = nameMap[sku];
if (!name) return;
evSh.getRange(i + 2, evNameCol).setValue(name);
totalPatched++;
});
}
}
// -- Patch NI_DailyTop5 (Name = col E, index 4) ---------------------------
var t5Sh = ss.getSheetByName('NI_DailyTop5');
if (t5Sh &&
t5Sh.getLastRow() >
1) {
var t5H = t5Sh.getRange(1, 1, 1, t5Sh.getLastColumn()).getValues()[0].map(String);
var t5NameCol = t5H.indexOf('Name') + 1;
var t5SkuCol = t5H.indexOf('SKU') + 1;
if (t5NameCol >
0 &&
t5SkuCol >
0) {
var t5Data = t5Sh.getRange(2, 1, t5Sh.getLastRow() - 1, t5Sh.getLastColumn()).getValues();
t5Data.forEach(function(row, i) {
var existingName = String(row[t5NameCol - 1] || '').trim();
if (existingName !== '') return;
var sku = String(row[t5SkuCol - 1] || '').trim();
var name = nameMap[sku];
if (!name) return;
t5Sh.getRange(i + 2, t5NameCol).setValue(name);
totalPatched++;
});
}
} SpreadsheetApp.flush();
Logger.log('patchNamesFromSKUMaster: patched ' + totalPatched + ' blank Name cells across NI_Events + NI_DailyTop5.');
}
// -- ONE-TIME: patch Impact Class in existing NI_DailyTop5 rows --------------
// Looks up each row's EH_ID in NI_Events - copies Impact Class.
// Safe to re-run; only writes cells where Top5 IC is blank or wrong.
// Run AFTER fixNIEventsImpactClass so NI_Events ICs are correct.
function patchTop5ImpactClass() {
var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
var evSh = ss.getSheetByName('NI_Events');
var t5Sh = ss.getSheetByName('NI_DailyTop5');
if (!evSh || !t5Sh) {
Logger.log('patchTop5ImpactClass: sheet not found.');
return;
}
var tz = Session.getScriptTimeZone();
function normDate(v) {
if (!v)
return '';
if (v instanceof Date)
return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
return String(v).trim().substring(0, 10);
}
// NI_Events has no EH_ID - build composite key (Date|SKU|Batch|Facility|Event) - Impact Class
// NI_Events cols: Date(0) Type(1) Direction(2) Category(3) SKU(4) Name(5) Brand(6)
// Batch(7) Facility(8) City(9) BizType(10) InvFrom(11) InvTo(12)
// StateFrom(13) StateTo(14) Qty(15) COGSPerUnit(16) COGSValue(17)
// Event(18) Severity(19) Impact Class(20)
var evH = evSh.getRange(1, 1, 1, evSh.getLastColumn()).getValues()[0].map(String);
var evICCol = evH.indexOf('Impact Class');
var evDateC = evH.indexOf('Date');
var evSkuC = evH.indexOf('SKU');
var evBatchC = evH.indexOf('Batch');
var evFacC = evH.indexOf('Facility');
var evEvC = evH.indexOf('Event');
if (evICCol <
0) {
Logger.log('patchTop5ImpactClass: NI_Events missing Impact Class — run fixNIEventsImpactClass first.');
return;
}
var evData = evSh.getRange(2, 1, evSh.getLastRow() - 1, evSh.getLastColumn()).getValues();
var icMap = {};
evData.forEach(function(r) {
var date = normDate(r[evDateC]);
var sku = String(r[evSkuC] || '').trim();
var batch = String(r[evBatchC] || '').trim();
var fac = String(r[evFacC] || '').trim();
var ev = String(r[evEvC] || '').trim();
var ic = String(r[evICCol] || '').trim();
if (ic) icMap[date+'|'+sku+'|'+batch+'|'+fac+'|'+ev] = ic;
});
// Debug: log first 3 NI_Events keys to check format
var sampleEvKeys = Object.keys(icMap).slice(0, 3);
Logger.log('Sample NI_Events keys: ' + JSON.stringify(sampleEvKeys));
Logger.log('patchTop5ImpactClass: built IC map for ' + Object.keys(icMap).length + ' NI_Events rows.');
// NI_DailyTop5 cols: EH_ID(0) Date(1) Brand(2) SKU(3) Name(4) Batch(5)
// NI_DailyTop5 cols: EH_ID(0) Date(1) Brand(2) SKU(3) Name(4) Batch(5)
// Facility(6) City(7) BizType(8) Event(9) Impact Class(10)
// Qty(11) COGSValue(12) Rank(13) Remark(14) Status(15) AssignedTo(16) RemarkDate(17)
var t5H = t5Sh.getRange(1, 1, 1, t5Sh.getLastColumn()).getValues()[0].map(String);
var t5ICCol = t5H.indexOf('Impact Class');
var t5DateC = t5H.indexOf('Date');
var t5SkuC = t5H.indexOf('SKU');
var t5BatC = t5H.indexOf('Batch');
var t5FacC = t5H.indexOf('Facility');
var t5EvC = t5H.indexOf('Event');
if (t5ICCol <
0) {
Logger.log('patchTop5ImpactClass: NI_DailyTop5 missing Impact Class column.');
return;
}
var t5Data = t5Sh.getRange(2, 1, t5Sh.getLastRow() - 1, t5Sh.getLastColumn()).getValues();
var patchCount = 0;
t5Data.forEach(function(row, i) {
var date = normDate(row[t5DateC]);
var sku = String(row[t5SkuC] || '').trim();
var batch = String(row[t5BatC] || '').trim();
var fac = String(row[t5FacC] || '').trim();
var ev = String(row[t5EvC] || '').trim();
var existing = String(row[t5ICCol] || '').trim();
var newIC = icMap[date+'|'+sku+'|'+batch+'|'+fac+'|'+ev] || '';
if (!newIC || existing === newIC) return;
t5Sh.getRange(i + 2, t5ICCol + 1).setValue(newIC);
patchCount++;
});
SpreadsheetApp.flush();
// Debug: log first 3 Top5 keys for comparison
var sampleT5Keys = t5Data.slice(0, 3).map(function(row) {
return normDate(row[t5DateC])+'|'+String(row[t5SkuC]||'').trim()+'|'+String(row[t5BatC]||'').trim()+'|'+String(row[t5FacC]||'').trim()+'|'+String(row[t5EvC]||'').trim();
});
Logger.log('Sample Top5 keys: ' + JSON.stringify(sampleT5Keys));
Logger.log('Top5 total rows: ' + t5Data.length + ' | IC col index: ' + t5ICCol);
Logger.log('patchTop5ImpactClass: updated ' + patchCount + ' rows in NI_DailyTop5.');
}

// ============================================================
// importBatchCOGSToLookup — run ONE TIME after importing cogs_batch_unique.csv
// to COGS_BatchMaster tab. Appends all batch rows into COGS_Lookup so that
// loadCOGSLookup_() picks them up at runtime (BATCH_COGS_CACHE).
// COGS_BatchMaster tab schema: SKU | Batch | COGSPerUnit | ProductName | Brand
// ============================================================
function importBatchCOGSToLookup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const srcSheet = ss.getSheetByName('COGS_BatchMaster');
  if (!srcSheet) {
    Logger.log('ERROR: COGS_BatchMaster tab not found. Import cogs_batch_unique.csv first.');
    return;
  }
  const destSheet = ss.getSheetByName('COGS_Lookup');
  if (!destSheet) {
    Logger.log('ERROR: COGS_Lookup tab not found.');
    return;
  }
  const srcData = srcSheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < srcData.length; i++) {
    const [sku, batch, cogs, name, brand] = srcData[i];
    if (sku && batch && cogs) {
      rows.push([String(sku).trim(), String(batch).trim(), parseFloat(cogs) || 0,
                 String(brand || '').trim(), 'GRN_Batch']);
    }
  }
  if (rows.length === 0) {
    Logger.log('No rows found in COGS_BatchMaster');
    return;
  }
  const lastRow = destSheet.getLastRow();
  destSheet.getRange(lastRow + 1, 1, rows.length, 5).setValues(rows);
  Logger.log('importBatchCOGSToLookup: appended ' + rows.length + ' batch rows to COGS_Lookup');
  Logger.log('Total COGS_Lookup rows now: ' + destSheet.getLastRow());
}

// backfillMissingDates — run ONE TIME to process June 15 and 16 (or any dates missing from NI_Events).
// Reads ALL Shelfwise emails from the last 7 days, finds consecutive day pairs for each missing date,
// and runs the full pipeline (analyzeImpact_ + saveResultsToSheet_) for each missing date.
// Safe to re-run — existing dates in NI_Events are skipped via the normal dedup in saveResultsToSheet_.
function backfillMissingDates() {
  try {
    loadCOGSLookup_();
    loadSKUNames_();
  } catch(e) {
    Logger.log('backfillMissingDates: setup error (non-fatal): ' + e);
  }

  // Get all Shelfwise emails from last 7 days
  var threads = GmailApp.search(NI_CONFIG.SUBJECT_FILTER + ' newer_than:7d', 0, 50);
  if (!threads || !threads.length) {
    Logger.log('backfillMissingDates: no Shelfwise emails found in last 7 days');
    return;
  }

  // Collect all snapshots
  var found = [];
  for (var i = 0; i < threads.length; i++) {
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length; j++) {
      var msg = msgs[j];
      var body = msg.getPlainBody() + msg.getBody();
      var m = body.match(/https:\/\/[a-zA-Z0-9\-\.]+\.cloudfront\.net\/[^\s"<>\n]+\.csv/i);
      if (!m) continue;
      var d = msg.getDate();
      found.push({
        url: m[0].trim(),
        date: d,
        dayKey: Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd'),
        hourIST: parseInt(Utilities.formatDate(d, 'Asia/Kolkata', 'HH'), 10)
      });
    }
  }

  if (!found.length) {
    Logger.log('backfillMissingDates: no CSV URLs found in emails');
    return;
  }

  // Dedupe by URL, group by day, pick closest to 7:45 AM per day
  var seen = {}, byDay = {};
  found.forEach(function(f) {
    if (seen[f.url]) return;
    seen[f.url] = true;
    if (!byDay[f.dayKey]) byDay[f.dayKey] = [];
    byDay[f.dayKey].push(f);
  });

  var tH = NI_CONFIG.TODAY_TARGET_HOUR || 7;
  var days = Object.keys(byDay).sort(); // oldest first
  Logger.log('backfillMissingDates: found Shelfwise snapshots for days: ' + days.join(', '));

  // Check which dates are already in NI_Events
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var evSh = ss.getSheetByName('NI_Events');
  var existingDates = {};
  if (evSh && evSh.getLastRow() > 1) {
    var evData = evSh.getRange(2, 1, evSh.getLastRow() - 1, 1).getValues();
    evData.forEach(function(r) {
      if (r[0]) existingDates[Utilities.formatDate(new Date(r[0]), 'Asia/Kolkata', 'yyyy-MM-dd')] = true;
    });
  }
  Logger.log('backfillMissingDates: dates already in NI_Events: ' + Object.keys(existingDates).sort().join(', '));

  // Process each consecutive pair where today's date is missing
  var processed = 0;
  for (var di = 1; di < days.length; di++) {
    var todayKey = days[di];
    var yesterdayKey = days[di - 1];
    if (existingDates[todayKey]) {
      Logger.log('backfillMissingDates: ' + todayKey + ' already in NI_Events — skipping');
      continue;
    }
    Logger.log('backfillMissingDates: processing ' + todayKey + ' vs ' + yesterdayKey);
    var todaySnap  = byDay[todayKey].slice().sort(function(a,b){ return Math.abs(a.hourIST-tH)-Math.abs(b.hourIST-tH); })[0];
    var yestSnap   = byDay[yesterdayKey].slice().sort(function(a,b){ return Math.abs(a.hourIST-tH)-Math.abs(b.hourIST-tH); })[0];
    var todayData  = fetchCSV_(todaySnap.url);
    var yesterdayData = fetchCSV_(yestSnap.url);
    if (!todayData.length || !yesterdayData.length) {
      Logger.log('backfillMissingDates: empty CSV for ' + todayKey + ' — skipping');
      continue;
    }
    Logger.log('Rows — Today (' + todayKey + '): ' + todayData.length + ' | Yesterday (' + yesterdayKey + '): ' + yesterdayData.length);
    var result = analyzeImpact_(yesterdayData, todayData, todaySnap.date, yestSnap.date);
    saveResultsToSheet_(result, todayData);
    Logger.log('backfillMissingDates: ' + todayKey + ' done — ' + result.totEv + ' events, val=' + fmtV_(result.totVal));
    processed++;
  }
  Logger.log('backfillMissingDates: DONE. Processed ' + processed + ' missing date(s).');
}

// backfillNIHistory — run ONE TIME to populate NI_History from NI_Events for all past dates.
// Reads NI_Events, groups by Date+BizType, writes rows matching appendHistory_() schema.
// Safe to re-run — skips dates already in NI_History.
function backfillNIHistory() {
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var evSh = ss.getSheetByName('NI_Events');
  if (!evSh || evSh.getLastRow() < 2) { Logger.log('backfillNIHistory: NI_Events empty'); return; }

  var histSh = ss.getSheetByName('NI_History');
  if (!histSh) { histSh = ss.insertSheet('NI_History'); }

  // Get dates already in NI_History to avoid duplicates
  var existingDates = {};
  if (histSh.getLastRow() > 1) {
    histSh.getRange(2, 1, histSh.getLastRow()-1, 1).getValues()
      .forEach(function(r){ existingDates[String(r[0]).trim()] = true; });
  }

  // Read NI_Events
  var evRaw = evSh.getDataRange().getValues();
  var hdr = evRaw[0];
  var iDate=hdr.indexOf('Date'), iType=hdr.indexOf('Type'), iDir=hdr.indexOf('Direction');
  var iBT=hdr.indexOf('BizType'), iQty=hdr.indexOf('Qty'), iCV=hdr.indexOf('COGSValue');
  var iIC=hdr.indexOf('Impact Class');

  // Group by Date + BizType
  var byDayBT = {};
  for (var i = 1; i < evRaw.length; i++) {
    var r = evRaw[i];
    var date = String(r[iDate]||'').trim(); if (!date) continue;
    var type = String(r[iType]||'').trim();
    var dir  = String(r[iDir]||'').trim();
    var bt   = String(r[iBT]||'Other').trim();
    var qty  = parseFloat(r[iQty])||0;
    var cv   = parseFloat(r[iCV])||0;
    var ic   = String(r[iIC]||'').trim();

    var key = date + '||' + bt;
    if (!byDayBT[key]) byDayBT[key] = {
      date:date, bt:bt,
      g2bQ:0,g2bV:0, g2qQ:0,g2qV:0,
      expQ:0,expV:0, grnQ:0,grnV:0,
      negQ:0,negV:0, posQ:0,posV:0
    };
    var x = byDayBT[key];

    if (type === 'POS') {
      x.posQ += qty; x.posV += cv;
    } else {
      x.negQ += qty; x.negV += cv;
      if (dir==='g2b'||dir==='g2rc') { x.g2bQ+=qty; x.g2bV+=cv; }
      else if (dir==='g2q')          { x.g2qQ+=qty; x.g2qV+=cv; }
      else if (dir==='a2ne'||dir==='ne2e'||dir==='a2e'||dir==='a2rc') { x.expQ+=qty; x.expV+=cv; }
      else if (dir==='newBad'||dir==='newQC') { x.grnQ+=qty; x.grnV+=cv; }
    }
  }

  // Group by date for TOTAL rows
  var byDay = {};
  Object.keys(byDayBT).forEach(function(key){
    var x = byDayBT[key];
    var d = x.date;
    if (!byDay[d]) byDay[d] = {g2bQ:0,g2bV:0,g2qQ:0,g2qV:0,expQ:0,expV:0,grnQ:0,grnV:0,negQ:0,negV:0,posQ:0,posV:0};
    var t = byDay[d];
    t.g2bQ+=x.g2bQ; t.g2bV+=x.g2bV; t.g2qQ+=x.g2qQ; t.g2qV+=x.g2qV;
    t.expQ+=x.expQ; t.expV+=x.expV; t.grnQ+=x.grnQ; t.grnV+=x.grnV;
    t.negQ+=x.negQ; t.negV+=x.negV; t.posQ+=x.posQ; t.posV+=x.posV;
  });

  // Build rows to append
  var newRows = [];
  var dates = Object.keys(byDay).sort();
  var skipped = 0, written = 0;
  dates.forEach(function(d){
    if (existingDates[d]) { skipped++; return; }
    // Per-BizType rows
    Object.keys(byDayBT).forEach(function(key){
      var x = byDayBT[key];
      if (x.date !== d) return;
      newRows.push([d, x.bt,
        x.g2bQ, x.g2bV, x.g2qQ, x.g2qV,
        x.expQ, x.expV, x.grnQ, x.grnV,
        x.negQ, x.negV, x.posQ, x.posV,
        x.negQ-x.posQ, x.negV-x.posV
      ]);
    });
    // TOTAL row
    var t = byDay[d];
    newRows.push([d, 'TOTAL',
      t.g2bQ, t.g2bV, t.g2qQ, t.g2qV,
      t.expQ, t.expV, t.grnQ, t.grnV,
      t.negQ, t.negV, t.posQ, t.posV,
      t.negQ-t.posQ, t.negV-t.posV
    ]);
    written++;
  });

  if (newRows.length === 0) {
    Logger.log('backfillNIHistory: nothing new to write. Dates skipped (already exist): ' + skipped);
    return;
  }

  // Ensure headers
  var hdrs = [['Date','Business Type','G2B Qty','G2B Value','G2Q Qty','G2Q Value','Expiry Qty','Expiry Value','BadGRN Qty','BadGRN Value','Total Neg Qty','Total Neg Value','Pos Qty','Pos Value','Net Qty','Net Value']];
  histSh.getRange(1,1,1,16).setValues(hdrs).setFontWeight('bold');

  histSh.getRange(histSh.getLastRow()+1, 1, newRows.length, 16).setValues(newRows);
  SpreadsheetApp.flush();
  Logger.log('backfillNIHistory: wrote ' + newRows.length + ' rows for ' + written + ' dates. Skipped ' + skipped + ' existing dates.');
}

// Re-patches COGSPerUnit + COGSValue in all existing NI_Events rows where COGS = 0.
// Also updates COGSValue in NI_DailyTop5 rows where it is 0.
// Run AFTER importBatchCOGSToLookup so COGS_Lookup is fully populated.
function patchCOGSInNIEvents() {
  loadCOGSLookup_();   // fills BATCH_COGS_CACHE + COGS_CACHE from COGS_Lookup sheet
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);

  // ---- Patch NI_Events ----
  var evSh = ss.getSheetByName('NI_Events');
  var evPatched = 0, evSkipped = 0;
  if (evSh && evSh.getLastRow() > 1) {
    var evH = evSh.getRange(1, 1, 1, evSh.getLastColumn()).getValues()[0].map(String);
    var colSKU   = evH.indexOf('SKU');
    var colBatch = evH.indexOf('Batch');
    var colQty   = evH.indexOf('Qty');
    var colCPU   = evH.indexOf('COGSPerUnit');
    var colCV    = evH.indexOf('COGSValue');
    if (colSKU < 0 || colCPU < 0 || colCV < 0) {
      Logger.log('patchCOGSInNIEvents: NI_Events header columns not found. Aborting.');
      return;
    }
    var evData = evSh.getRange(2, 1, evSh.getLastRow() - 1, evSh.getLastColumn()).getValues();
    evData.forEach(function(row, i) {
      var existingCOGS = parseFloat(row[colCPU]) || 0;
      if (existingCOGS > 0) { evSkipped++; return; }  // already has COGS
      var sku   = String(row[colSKU]   || '').trim();
      var batch = String(row[colBatch] || '').trim();
      var qty   = parseFloat(row[colQty]) || 0;
      var cogs  = getCOGS_(sku, batch);
      if (!cogs) return;
      var cogsVal = Math.round(cogs * qty * 100) / 100;
      evSh.getRange(i + 2, colCPU + 1).setValue(cogs);
      evSh.getRange(i + 2, colCV  + 1).setValue(cogsVal);
      evPatched++;
    });
    SpreadsheetApp.flush();
    Logger.log('NI_Events: patched ' + evPatched + ' rows, skipped ' + evSkipped + ' (already had COGS).');
  }

  // ---- Patch NI_DailyTop5 ----
  var t5Sh = ss.getSheetByName('NI_DailyTop5');
  var t5Patched = 0;
  if (t5Sh && t5Sh.getLastRow() > 1) {
    var t5H = t5Sh.getRange(1, 1, 1, t5Sh.getLastColumn()).getValues()[0].map(String);
    var t5SKU   = t5H.indexOf('SKU');
    var t5Batch = t5H.indexOf('Batch');
    var t5Qty   = t5H.indexOf('Qty');
    var t5CV    = t5H.indexOf('COGSValue');
    if (t5SKU < 0 || t5CV < 0) {
      Logger.log('patchCOGSInNIEvents: NI_DailyTop5 header columns not found.');
    } else {
      var t5Data = t5Sh.getRange(2, 1, t5Sh.getLastRow() - 1, t5Sh.getLastColumn()).getValues();
      t5Data.forEach(function(row, i) {
        var existingCV = parseFloat(row[t5CV]) || 0;
        if (existingCV > 0) return;
        var sku   = String(row[t5SKU]   || '').trim();
        var batch = String(row[t5Batch] || '').trim();
        var qty   = parseFloat(row[t5Qty]) || 0;
        var cogs  = getCOGS_(sku, batch);
        if (!cogs) return;
        t5Sh.getRange(i + 2, t5CV + 1).setValue(Math.round(cogs * qty * 100) / 100);
        t5Patched++;
      });
      SpreadsheetApp.flush();
      Logger.log('NI_DailyTop5: patched ' + t5Patched + ' rows.');
    }
  }
  Logger.log('patchCOGSInNIEvents: DONE. Total NI_Events patched: ' + evPatched + ', NI_DailyTop5 patched: ' + t5Patched);
}

// One-time backfill: re-keys all existing NI_DailyTop5 rows to use revised event names.
// Run once from Apps Script editor. Safe to re-run — already-correct rows are skipped.
function reKeyDailyTop5() {
  var ss     = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var top5Sh = ss.getSheetByName('NI_DailyTop5');
  var evSh   = ss.getSheetByName('NI_Events');
  if (!top5Sh || !evSh) { Logger.log('ERROR: sheet not found'); return; }

  // ── 1. Build StateTo lookup from NI_Events ─────────────────────────────
  // key = "date|sku|batch|facility|direction"  →  StateTo string
  var evVals = evSh.getDataRange().getValues();
  var evH    = {};
  evVals[0].forEach(function(col, i) { evH[col] = i; });

  function fmtDate_(v) {
    if (!v) return '';
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return String(v).trim();
  }

  var evMap = {};
  for (var i = 1; i < evVals.length; i++) {
    var r   = evVals[i];
    var key = [fmtDate_(r[evH['Date']]), String(r[evH['SKU']]||'').trim(),
               String(r[evH['Batch']]||'').trim(), String(r[evH['Facility']]||'').trim(),
               String(r[evH['Direction']]||'').trim()].join('|');
    if (!evMap[key]) evMap[key] = String(r[evH['StateTo']] || '').trim();
  }

  // ── 2. Load NI_DailyTop5 ────────────────────────────────────────────────
  var t5Vals = top5Sh.getDataRange().getValues();
  var t5H    = {};
  t5Vals[0].forEach(function(col, i) { t5H[col] = i; });

  var C_EHID    = t5H['EH_ID'],    C_DATE  = t5H['Date'],   C_SKU    = t5H['SKU'];
  var C_BATCH   = t5H['Batch'],    C_FAC   = t5H['Facility'], C_EVENT = t5H['Event'];
  var C_REMARK  = t5H['Remark'],   C_STAT  = t5H['Status'];
  var C_ASSIGN  = t5H['AssignedTo'], C_RD  = t5H['RemarkDate'];

  // Collect all current EH_IDs for duplicate detection
  var allEhIds = {};
  for (var i = 1; i < t5Vals.length; i++) {
    var id = String(t5Vals[i][C_EHID] || '').trim();
    if (id) allEhIds[id] = i; // row index → last seen (overwrite ok)
  }

  // ── 3. Event name derivation (mirrors appendDailyTop5_ logic) ──────────
  function deriveEvent_(origEvent, sT) {
    if (origEvent === 'Good to Bad') {
      if (sT === 'About_to_expire') return 'Active to Near Expiry';
      if (sT === 'Recalled')        return 'Active to Recalled';
      return 'Good to Bad';
    }
    if (origEvent === 'Good to QC' || origEvent === 'Good to QC Rejected') return 'Good to QC Rejected';
    if (origEvent === 'Good to Recalled')  return 'Active to Recalled';
    if (origEvent === 'Direct QC GRN') {
      return (sT === 'About_to_expire' || sT === 'Expired') ? 'Direct Expired GRN' : 'Direct Bad GRN';
    }
    if (origEvent === 'Direct Bad GRN') {
      return (sT === 'About_to_expire' || sT === 'Expired') ? 'Direct Expired GRN' : 'Direct Bad GRN';
    }
    return origEvent; // already revised or unknown — leave as-is
  }

  function dirFromEvent_(ev) {
    if (ev === 'Good to Bad')              return 'g2b';
    if (ev === 'Good to QC' || ev === 'Good to QC Rejected') return 'g2q';
    if (ev === 'Good to Recalled')         return 'g2rc';
    if (ev === 'Active to Near Expiry')    return 'a2ne';
    if (ev === 'Active to Recalled')       return 'g2rc';
    if (ev === 'Direct Bad GRN')           return 'newBad';
    if (ev === 'Direct QC GRN')            return 'newQC';
    if (ev === 'Direct Expired GRN')       return 'newBad';
    return '';
  }

  // ── 4. Build update list ─────────────────────────────────────────────────
  var updates = [], alreadyOk = 0, dupSkip = 0;

  for (var i = 1; i < t5Vals.length; i++) {
    var row       = t5Vals[i];
    var dateStr   = fmtDate_(row[C_DATE]);
    var sku       = String(row[C_SKU]   || '').trim();
    var batch     = String(row[C_BATCH] || '').trim();
    var fac       = String(row[C_FAC]   || '').trim();
    var origEv    = String(row[C_EVENT] || '').trim();
    var oldEhId   = String(row[C_EHID]  || '').trim();
    var existRmk  = String(row[C_REMARK]|| '').trim();

    var dir       = dirFromEvent_(origEv);
    var sT        = evMap[[dateStr, sku, batch, fac, dir].join('|')] || '';
    var newEv     = deriveEvent_(origEv, sT);
    var newEhId   = makeEhId_(dateStr, sku, batch, fac, newEv);

    if (newEhId === oldEhId) { alreadyOk++; continue; }

    // Skip if new EH_ID already belongs to a DIFFERENT row
    if (allEhIds[newEhId] !== undefined && allEhIds[newEhId] !== i) {
      Logger.log('SKIP dup row ' + (i+1) + ': ' + newEhId);
      dupSkip++; continue;
    }

    var isAuto   = (newEv === 'Active to Near Expiry' || newEv === 'Active to Recalled');
    var autoTxt  = newEv === 'Active to Near Expiry' ? 'System Triggered - Expiry workflow'
                 : newEv === 'Active to Recalled'    ? 'QC Triggered - Batch Recalled' : '';

    updates.push({
      ri:        i + 1,                                        // 1-based sheet row
      newEhId:   newEhId,
      newEv:     newEv,
      newRmk:    existRmk || (isAuto ? autoTxt : ''),
      newStat:   (isAuto && !existRmk) ? 'Completed' : String(row[C_STAT]  || ''),
      newAssign: (isAuto && !existRmk) ? 'System'    : String(row[C_ASSIGN]|| ''),
      newRd:     (isAuto && !existRmk) ? dateStr     : String(row[C_RD]    || ''),
    });

    // Update in-memory map so later rows don't collision-match this new ID
    delete allEhIds[oldEhId];
    allEhIds[newEhId] = i;
  }

  Logger.log('reKeyDailyTop5: ' + updates.length + ' to update | ' + alreadyOk + ' already correct | ' + dupSkip + ' dup-skipped');
  if (!updates.length) { Logger.log('Nothing to do.'); return; }

  // ── 5. Write back (full-row batch where possible) ───────────────────────
  updates.forEach(function(u) {
    top5Sh.getRange(u.ri, C_EHID   + 1).setValue(u.newEhId);
    top5Sh.getRange(u.ri, C_EVENT  + 1).setValue(u.newEv);
    if (u.newRmk)    top5Sh.getRange(u.ri, C_REMARK + 1).setValue(u.newRmk);
    if (u.newStat)   top5Sh.getRange(u.ri, C_STAT   + 1).setValue(u.newStat);
    if (u.newAssign) top5Sh.getRange(u.ri, C_ASSIGN + 1).setValue(u.newAssign);
    if (u.newRd)     top5Sh.getRange(u.ri, C_RD     + 1).setValue(u.newRd);
  });
  SpreadsheetApp.flush();
  Logger.log('reKeyDailyTop5: DONE — updated ' + updates.length + ' rows.');
}

function buildChatContext_() {
  var ss = SpreadsheetApp.openById(NI_CONFIG.SHEET_ID);
  var sh = ss.getSheetByName('NI_Events');
  if (!sh) return {error: 'NI_Events sheet not found'};

  var data = sh.getDataRange().getValues();
  if (data.length < 2) return {error: 'NI_Events is empty'};

  var headers = data[0].map(function(h){ return String(h).trim(); });
  var iDate = headers.indexOf('Date');
  var iBrand = headers.indexOf('Brand');
  var iSKU = headers.indexOf('SKU');
  var iName = headers.indexOf('Name');
  var iFac = headers.indexOf('Facility');
  var iBT = headers.indexOf('BizType');
  var iDir = headers.indexOf('Direction');
  var iEv = headers.indexOf('Event');
  var iIC = headers.indexOf('Impact Class');
  var iQty = headers.indexOf('Qty');
  var iCOGS = headers.indexOf('COGSValue');

  var cutoff = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

  var brandSum = {}, eventSum = {}, skuSum = {}, facSum = {}, dirSum = {}, dailySum = {};

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var dv = r[iDate];
    var d = (dv instanceof Date && !isNaN(dv.getTime())) ? dv : (dv ? new Date(String(dv)) : null);
    if (!d || isNaN(d.getTime()) || d < cutoff) continue;

    var brand = String(r[iBrand] || '').trim();
    var sku   = String(r[iSKU]   || '').trim();
    var name  = String(r[iName]  || '').trim();
    var fac   = String(r[iFac]   || '').trim();
    var bt    = String(r[iBT]    || '').trim();
    var dir   = String(r[iDir]   || '').trim();
    var ev    = String(r[iEv]    || '').trim();
    var ic    = String(r[iIC]    || '').trim();
    var qty   = parseFloat(r[iQty])  || 0;
    var cogs  = parseFloat(r[iCOGS]) || 0;
    var dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd MMM yyyy');

    if (!brandSum[brand]) brandSum[brand] = {cogs:0, count:0};
    brandSum[brand].cogs += cogs; brandSum[brand].count += 1;

    if (!eventSum[ev]) eventSum[ev] = {cogs:0, count:0};
    eventSum[ev].cogs += cogs; eventSum[ev].count += 1;

    if (!skuSum[sku]) skuSum[sku] = {name:name, brand:brand, cogs:0, count:0};
    skuSum[sku].cogs += cogs; skuSum[sku].count += 1;

    var facKey = fac + ' (' + bt + ')';
    if (!facSum[facKey]) facSum[facKey] = {cogs:0, count:0};
    facSum[facKey].cogs += cogs; facSum[facKey].count += 1;

    if (!dirSum[dir]) dirSum[dir] = {cogs:0, count:0};
    dirSum[dir].cogs += cogs; dirSum[dir].count += 1;

    if (!dailySum[dateKey]) dailySum[dateKey] = {cogs:0, count:0};
    dailySum[dateKey].cogs += cogs; dailySum[dateKey].count += 1;
  }

  function topN(obj, n) {
    return Object.keys(obj).map(function(k){ return {key:k, cogs:obj[k].cogs, count:obj[k].count}; })
      .sort(function(a,b){ return b.cogs - a.cogs; }).slice(0, n);
  }
  function topNsku(n) {
    return Object.keys(skuSum).map(function(k){ return {sku:k, name:skuSum[k].name, brand:skuSum[k].brand, cogs:skuSum[k].cogs, count:skuSum[k].count}; })
      .sort(function(a,b){ return b.cogs - a.cogs; }).slice(0, n);
  }

  return {
    period: 'Last 30 days',
    totalRows: data.length - 1,
    brandBreakdown:    topN(brandSum, 10),
    eventBreakdown:    topN(eventSum, 10),
    facilityBreakdown: topN(facSum,   10),
    directionBreakdown:topN(dirSum,   10),
    top30SkusByCOGS:   topNsku(30),
    dailyTrend:        Object.keys(dailySum).sort().map(function(k){ return {date:k, cogs:dailySum[k].cogs, count:dailySum[k].count}; })
  };
}

function callClaude_(dataJson, question) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) return {error:'api_key_not_configured'};

  var systemPrompt = 'You are an inventory quality analyst for Mosaic Wellness, an Indian health & wellness brand.\n'
    + 'You are given a pre-aggregated summary of all NI_Events for the last 30 days. It contains:\n'
    + '- brandBreakdown: COGS loss and event count per brand\n'
    + '- eventBreakdown: COGS loss and count per event type\n'
    + '- facilityBreakdown: COGS loss and count per facility+biztype\n'
    + '- directionBreakdown: COGS loss per direction code (g2b=Good->Bad, g2q=Good->QC, newBad=Direct Bad GRN, a2ne=Near Expiry, POS=Recovery)\n'
    + '- top30SkusByCOGS: top 30 products by COGS loss, each with sku, name, brand, cogs, count — sorted highest first\n'
    + '- dailyTrend: per-day COGS and event count\n\n'
    + 'Rules:\n'
    + '- Answer in 2-5 sentences. Be specific — use actual numbers, SKU names, facility names from the data.\n'
    + '- Use Rs symbol with Indian number format (e.g. Rs 1,23,456).\n'
    + '- All breakdowns are already pre-sorted by COGS descending — use rank order directly.\n'
    + '- Never say the data is insufficient or unavailable — all the data you need is in the summary above.';

  var userContent = 'Data:\n' + dataJson + '\n\nQuestion: ' + question;

  var payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{role:'user', content: userContent}]
  });

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {'x-api-key': apiKey, 'anthropic-version': '2023-06-01'},
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    var code = resp.getResponseCode();
    if (code !== 200) return {error:'claude_api_error', detail:'HTTP ' + code + ': ' + resp.getContentText().slice(0,200)};
    var json = JSON.parse(resp.getContentText());
    var block = json.content && json.content[0];
    return {answer: (block && block.text) ? block.text : 'No response from Claude.'};
  } catch(e) {
    return {error:'claude_api_error', detail: e.message};
  }
}

function handleChatQuery_(question) {
  if (!question || !question.trim()) return {error:'empty_question'};
  var enabled = PropertiesService.getScriptProperties().getProperty('CHATBOT_ENABLED');
  if (enabled === 'false') return {answer: '🔴 Chatbot is currently disabled. An admin can re-enable it from the dashboard.', disabled: true};
  var ctx = buildChatContext_();
  if (ctx.error) return {answer: 'Could not load inventory data: ' + ctx.error};
  return callClaude_(JSON.stringify(ctx), question);
}
