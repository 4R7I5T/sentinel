package sentinelgroup.io.sentinel.network.model;

import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class VpnList implements Serializable {
    @SerializedName("account_addr")
    public String accountAddress;
    public String ip;
    public double latency;
    public Location location;
    @SerializedName("net_speed")
    public NetSpeed netSpeed;
    @SerializedName("price_per_GB")
    public double pricePerGb;
}