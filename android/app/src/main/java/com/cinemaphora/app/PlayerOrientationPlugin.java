package com.cinemaphora.app;

import android.content.pm.ActivityInfo;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sensor-aware landscape lock for fullscreen playback.
 *
 * @capacitor/screen-orientation maps both "landscape" and "landscape-primary" to
 * SCREEN_ORIENTATION_LANDSCAPE, which pins the activity to one physical
 * direction: rotating the phone 180 degrees while watching leaves the video
 * upside down relative to the user. It exposes no sensor variant, so the
 * orientation we actually want has to come from here.
 *
 * SCREEN_ORIENTATION_SENSOR_LANDSCAPE keeps the app in landscape while still
 * following the accelerometer between the two landscape directions.
 */
@CapacitorPlugin(name = "PlayerOrientation")
public class PlayerOrientationPlugin extends Plugin {

    @PluginMethod
    public void lockSensorLandscape(PluginCall call) {
        getActivity().runOnUiThread(
            () -> getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
        );
        call.resolve();
    }
}
