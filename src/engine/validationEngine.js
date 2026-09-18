export class ValidationEngine {
  static validateArgo(argo, oceanEngine, variable = 'temp', timeIdx = 0) {
    const comparison = [];
    const obsArr = [];
    const modArr = [];

    let points = [];
    if (Array.isArray(argo?.profile)) {
      points = argo.profile;
    } else if (Array.isArray(argo?.depths)) {
      points = argo.depths.map((d, i) => ({
        depth: d,
        [variable]: argo[variable]?.[i] ?? argo.values?.[i] ?? 0,
        qc: argo.qc?.[i] ?? 1,
      }));
    }

    for (const pt of points) {
      const observed = pt[variable] ?? pt.val ?? pt.value;
      if (observed !== undefined && !isNaN(observed)) {
        const modeled = oceanEngine.samplePoint(
          variable,
          timeIdx,
          argo.latitude || 0,
          argo.longitude || 0,
          pt.depth || 0
        );

        obsArr.push(observed);
        modArr.push(modeled);

        comparison.push({
          depth: pt.depth || 0,
          observed: Number(observed.toFixed(3)),
          modeled: Number(modeled.toFixed(3)),
          diff: Number((modeled - observed).toFixed(3)),
          qc: pt.qc || 1,
        });
      }
    }

    // Statistical Metrics
    let sumSqDiff = 0;
    let sumDiff = 0;
    const n = obsArr.length;

    for (let i = 0; i < n; i++) {
      const d = modArr[i] - obsArr[i];
      sumDiff += d;
      sumSqDiff += d * d;
    }

    const rmse = n > 0 ? Math.sqrt(sumSqDiff / n) : 0;
    const bias = n > 0 ? sumDiff / n : 0;

    // Pearson Correlation (r)
    let pearsonR = 1.0;
    if (n > 2) {
      const meanObs = obsArr.reduce((a, b) => a + b, 0) / n;
      const meanMod = modArr.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let denObs = 0;
      let denMod = 0;

      for (let i = 0; i < n; i++) {
        const oDiff = obsArr[i] - meanObs;
        const mDiff = modArr[i] - meanMod;
        num += oDiff * mDiff;
        denObs += oDiff * oDiff;
        denMod += mDiff * mDiff;
      }

      const denom = Math.sqrt(denObs * denMod);
      pearsonR = denom > 0 ? num / denom : 1.0;
    }

    return {
      platform_id: argo.platform_id,
      wmo_id: argo.wmo_id || argo.platform_id,
      basin: argo.basin || 'Indian Ocean',
      instrument_type: argo.instrument_type,
      variable,
      latitude: argo.latitude,
      longitude: argo.longitude,
      timestamp: argo.timestamp,
      metrics: {
        rmse: Number(rmse.toFixed(3)),
        bias: Number(bias.toFixed(3)),
        pearsonR: Number(pearsonR.toFixed(3)),
        point_count: n,
      },
      comparison,
    };
  }

  static validateGlider(glider, oceanEngine, variable = 'temp', timeIdx = 0) {
    const comparison = [];
    const obsArr = [];
    const modArr = [];
    const waypoints = Array.isArray(glider?.waypoints) ? glider.waypoints : [];

    for (const wp of waypoints) {
      const observed = wp[variable] ?? wp.val ?? wp.value;
      if (observed !== undefined) {
        const modeled = oceanEngine.samplePoint(
          variable,
          timeIdx,
          wp.latitude,
          wp.longitude,
          wp.depth
        );

        obsArr.push(observed);
        modArr.push(modeled);

        comparison.push({
          depth: wp.depth,
          timestamp: wp.timestamp,
          observed: Number(observed.toFixed(3)),
          modeled: Number(modeled.toFixed(3)),
          diff: Number((modeled - observed).toFixed(3)),
        });
      }
    }

    let sumSqDiff = 0;
    let sumDiff = 0;
    const n = obsArr.length;

    for (let i = 0; i < n; i++) {
      const d = modArr[i] - obsArr[i];
      sumDiff += d;
      sumSqDiff += d * d;
    }

    const rmse = n > 0 ? Math.sqrt(sumSqDiff / n) : 0;
    const bias = n > 0 ? sumDiff / n : 0;

    // Pearson Correlation (r)
    let pearsonR = 1.0;
    if (n > 2) {
      const meanObs = obsArr.reduce((a, b) => a + b, 0) / n;
      const meanMod = modArr.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let denObs = 0;
      let denMod = 0;

      for (let i = 0; i < n; i++) {
        const oDiff = obsArr[i] - meanObs;
        const mDiff = modArr[i] - meanMod;
        num += oDiff * mDiff;
        denObs += oDiff * oDiff;
        denMod += mDiff * mDiff;
      }

      const denom = Math.sqrt(denObs * denMod);
      pearsonR = denom > 0 ? num / denom : 1.0;
    }

    return {
      mission_id: glider.mission_id,
      mission_name: glider.mission_name || glider.mission_id,
      instrument_type: glider.instrument_type,
      variable,
      metrics: {
        rmse: Number(rmse.toFixed(3)),
        bias: Number(bias.toFixed(3)),
        pearsonR: Number(pearsonR.toFixed(3)),
        point_count: n,
      },
      comparison,
    };
  }
}

