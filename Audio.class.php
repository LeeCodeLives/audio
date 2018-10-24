<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK IT ]
// +----------------------------------------------------------------------
// | 2017/11/13
// +----------------------------------------------------------------------
// | Li Jie
// +----------------------------------------------------------------------
// | 你会用就OK了！
// +----------------------------------------------------------------------
namespace Org\Util;

class Audio {
	/**
	 * 架构函数
	 * @param config 系统配置
	 * @param type 【1  H5】 【2  微信】  【3  小程序】
	 * @param file 文件路径
	 * @param file_type 文件类型  wav  mp3 等等
	 */
	public function __construct($config, $file, $type, $file_type) {
		$this->file_type = $file_type; //文件类型
		$this->ApiKey = $config['ApiKey']; //百度key
		$this->SecretKey = $config['SecretKey']; //百度秘钥
		$this->AuthUrl = $config['AuthUrl']; //百度认证url
		$this->AudioUrl = $config['AudioUrl']; //识别url
		$this->data = array('status' => false, 'msg' => ''); //返回信息
		$this->fileName = $file; //文件路径
	}
	//返回结果
	public function audio_content() {
		$token = $this->getBaiduToken();
		$data = $this->translate($token);
		return $data;
	}
	//获取百度token
	private function getBaiduToken() {
		$auth_url = $this->AuthUrl . 'client_id=' . $this->ApiKey . '&client_secret=' . $this->SecretKey;
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $auth_url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

		$response = curl_exec($ch);

		if (curl_errno($ch)) {
			$this->data['msg'] = '请求失败';
			return $this->data;
		}
		curl_close($ch);
		$response = json_decode($response, true);
		return $response['access_token'];
	}
	//翻译
	private function translate($token) {
		$cuid = "test_cuid";
		$url = $this->AudioUrl . "cuid=" . $cuid . "&token=" . $token;
		$audio = file_get_contents($this->fileName);
		$content_len = "Content-Length: " . strlen($audio);
		$sampleRate = 16000;
		$header = array($content_len, 'Content-Type: audio/' . $this->file_type . '; rate=' . $sampleRate . ';');
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
		curl_setopt($ch, CURLOPT_TIMEOUT, 30);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $audio);
		$response = curl_exec($ch);
		if (curl_errno($ch)) {
			$this->data['msg'] = '识别失败';
			return $this->data;
		}
		curl_close($ch);
		$response = json_decode($response, true);
		if ($response['err_msg'] == 'success.') {
			$this->data['status'] = true;
			$this->data['msg'] = $response['result'][0];
			return $this->data;
		} else {
			$this->data['msg'] = '识别失败';
			return $this->data;
		}
	}
}
?>