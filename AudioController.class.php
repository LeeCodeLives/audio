<?php
/**
 *
 * 版权所有：素材火<qwadmin.sucaihuo.com>
 * 作    者：素材水<hanchuan@sucaihuo.com>
 * 日    期：2016-09-20
 * 版    本：1.0.0
 * 功能说明：后台首页控制器。
 *
 **/

namespace Qwadmin\Controller;
use Think\Controller;

class AudioController extends Controller {
	//语音翻译接口
	public function index() {
		$data = array("status" => false, 'msg' => '', 'data' => '');
		$upload = new \Think\Upload(); // 实例化上传类
		$upload->maxSize = 3145728; // 设置附件上传大小
		$upload->exts = array('jpg', 'gif', 'png', 'jpeg', 'mp3', 'wav'); // 设置附件上传类型
		$upload->rootPath = './Audio/'; // 设置附件上传根目录
		$upload->autoSub = false;
		// 上传单个文件
		$info = $upload->uploadOne($_FILES['file']);
		if (!$info) {
			// 上传错误提示错误信息
			$data['msg'] = $upload->getError();
			$this->ajaxReturn($data);die;
		} else {
			// 上传成功 获取上传文件信息
			$data['status'] = true;
			$data['data'] = $info['savename'];
			$data['msg'] = "成功";
			//file_put_contents("./test.txt", print_R($_FILES, true));
			//echo json_encode($data);die;
		}
		$path = './Audio/' . $info['savename'];
		$patht = './Audio/' . $info['savename'] . ".wav";
		$res = exec("ffmpeg -i $path -ab 12.2k -ar 16000 -ac 1 $patht", $res);
		$a = new \Org\Util\Audio(C('baidu_audio'), $patht, 3, 'wav');
		$this->ajaxReturn($a->audio_content());
	}
	//语音识别
	public function recognition() {
		//echo print_R($_FILES);
		$file = $_FILES['file'];
		$a = new \Org\Util\Audio(C('baidu_audio'), $file['tmp_name'], 3, 'wav');
		$this->ajaxReturn($a->audio_content());
	}
	public function audio() {
		$this->display();
	}
	//小程序获取用户手机
	public function getcode() {
		//$data = array("status" => false, 'msg' => '', 'data' => '');
		$code = I('code'); //小程序传的code
		$code_url = "https://api.weixin.qq.com/sns/jscode2session?appid=" . C('weixin_config')['appid'] . "&secret=" . C('weixin_config')['AppSecret'] . "&js_code=" . $code . "&grant_type=authorization_code";
		$data = $this->curlGet($code_url);
		echo json_encode($data);
	}
	//获取小程序登录手机号
	public function get_phone() {
		$iv = I('iv');
		$encryptedData = I('encryptedDate');
		$code = I('code');
		include_once "./getphone/wxBizDataCrypt.php";
		$pc = new \WXBizDataCrypt(C('weixin_config')['appid'], $code);
		$errCode = $pc->decryptData($encryptedData, $iv, $data);
		if ($errCode == 0) {
			print($data . "\n");
		} else {
			print($errCode . "\n");
		}
	}
	public function curlGet($url) {
		$ch = curl_init();
		curl_setopt($ch, CURLOP_TIMEOUT, 30);
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
		curl_setopt($ch, CURLOPT_HEADER, FALSE);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
		$res = curl_exec($ch);
		curl_close($ch);
		return json_decode($res, true);
	}
	public function return_image() {
		$p = intval(I("page")) ? intval(I("page")) : 1;
		$count = M("image")->count();
		$limit = ($p - 1) * 10;
		$list = M("image")->limit($limit, 10)->order("id asc")->select();
		foreach ($list as $k => $v) {
			$list[$k]['name'] = "https://www.itwzd.com/Public/return_img/" . $v['name'];
		}
		if ($p > 1) {
			$data['data'] = $list;
		} else {
			$data['data'] = $list;
			$num = rand(1, 5);
			$data['yy'] = "https://www.itwzd.com/Public/MP3/" . $num . ".mp3";
		}
		echo json_encode($data, JSON_UNESCAPED_UNICODE);
	}
}